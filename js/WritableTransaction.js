import Transaction from './Transaction.js'
import ChunkProducer from './ChunkProducer.js'
import { ObservableEntry, wait, waitAll } from './util/ObservableEntry.js'

// 한번에 큰 arraybuffer를 전송시에도 채널이 터질 수 있음
// 따라서 데이터를 청크로 끊어서 보내야 함
const CHUNK_SIZE = 200 * 1024 // 200KB

/*
전체 파이프 구조:
source -> chunkingStream -> writable --- socket --- readable -> destination

 - 전송 완료: writable close 불림 -> socket에서 done 이벤트 발생 -> readable에서 데이터 채널 close 이벤트 기다림 -> 스트림 닫기
                                  -> 데이터 채널 닫음(done 이벤트와 바이너리 데이터의 전송 순서는 지켜지지 않으므로 readable에서 닫을 수 없음)
 - 보내는 쪽에서 중단할때: writable abort 불림 -> socket에서 abort 이벤트 발생 -> readable에서 에러 발생시키고 소켓 닫음
 - 받는 쪽에서 중단할때:  readable cancel 불림 -> socket에서 cancel 이벤트 발생 -> writable에서 에러 발생시키고 소켓 닫음
 - 일시정지(readable): readable에서 'pause', 'resume' 이벤트 발생 -> writable에서 받아서 흐름 조절
*/

/**
 * @typedef {import('./RTCSocket.js').default} RTCSocket
 */

export default class WritableTransaction extends Transaction {
  /**
   * 트렌젝션을 만듭니다.
   * @param {RTCSocket} socket 데이터 전송에 사용할 RTCSocket
   * @param {object} metadata 상대에게 전송할 메타데이터. 트렌젝션이 만들어진 후 `metadata` 속성으로 읽을 수 있습니다. `size` 속성은 필수이며 그 이외의 속성은 임의로 추가할 수 있습니다.
   * @param {number} metadata.size 바이트로 나타낸 트렌젝션의 크기.
   */
  constructor (socket, metadata) {
    super(socket, metadata)

    this.readableBufferFull = new ObservableEntry(false)
    this.aborted = false
    this.canceled = false

    const writable = new WritableStream({
      start: controller => {
        const isDone = () => this.processed.get() === metadata.size

        // cancel 이벤트 오면 에러 발생시켜서 스트림을 멈춤
        socket.once('cancel', errMsg => {
          this.canceled = true
          socket.close()
          controller.error(new Error('Transaction canceled: ' + errMsg))
        })

        socket.once('close', () => {
          this.stopReport()
          if (this.aborted || this.canceled || isDone()) return

          controller.error(new Error('Socket has been closed unexpectedly'))
        })

        // readable측에서 요청하는 pause / resume 이벤트 받기
        socket.on('pause', () => super.pause())
        socket.on('resume', () => super.resume())

        socket.on('buffer-full', () => this.readableBufferFull.set(true))
        socket.on('pull', () => this.readableBufferFull.set(false))
      },
      /**
       * @param {Uint8Array} data
       */
      write: async data => {
        // 일시정지 기능
        if (this.paused.get() || this.readableBufferFull.get()) {
          await waitAll(wait => {
            wait(this.paused).toBe(false)
            wait(this.readableBufferFull).toBe(false)
          })
        }

        await socket.write(data.buffer)
        await wait(socket.ready).toBe(true)

        this.processed.set(this.processed.get() + data.length)
      },
      close: async () => {
        // 여기는 위 write가 완료되어야 호출되므로 일단 모든 메시지가 데이터 채널의 버퍼로 들어간 상태
        // 데이터 채널의 버퍼가 비면 닫기(close() 시 버퍼에 있는 메시지는 전송될지 확신할 수 없음)
        // if (socket.dataChannel.bufferedAmount > 0) {
        //   console.log(`[Transaction:${this.label}] 소켓이 닫히기를 기다리는 중`)
        //   socket.dataChannel.bufferedAmountLowThreshold = 0
        //   await once(socket.dataChannel, 'bufferedamountlow')
        // }

        // // 전송 완료 이벤트 전달
        // // ready-to-close 이벤트를 받는 이유: 그냥 닫으면 done 이벤트가 아에 전송이 안되는 경우가 발생
        // socket.writeEvent('done')
        // await once(socket, 'ready-to-close')

        // socket.close()
        this.done.set(true)
      },
      // abort되면 abort 이벤트 전달
      abort: reason => {
        this.aborted = true

        if (reason instanceof Error) {
          socket.writeEvent('abort', reason.message)
        } else {
          socket.writeEvent('abort', reason)
        }

        console.log(`[Transaction:${this.label}] Abort 됨`)
      }
    })

    this.abortController = new AbortController()

    // 이렇게 하면 pipeTo(transactionWriter.stream)처럼 사용 가능
    // 뒤의 catch()문은 abort시 에러가 두군데에서 발생하는데(여기와 this.stream에 pipeTo 한 부분)
    // 여기서 에러가 발생하지 않게 하기 위한 것임
    // eslint-disable-next-line no-undef
    const chunkingStream = new TransformStream(new ChunkProducer(CHUNK_SIZE))
    chunkingStream.readable.pipeTo(writable, { signal: this.abortController.signal }).catch(() => {})
    this.stream = chunkingStream.writable
  }

  /**
   * 트렌젝션을 중지합니다.
   */
  stop () {
    // stream의 write 메소드가 resolve 되어야지 abort가 정상적으로 처리됨
    // 따라서 강제로 상태 업데이트
    this.paused.set(false)
    this.readableBufferFull = false
    this.abortController.abort('stop() called by sender')
  }

  pause () {
    super.pause()
    this.socket.writeEvent('pause')
  }

  resume () {
    super.resume()
    this.socket.writeEvent('resume')
  }
}
