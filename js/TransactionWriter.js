import Transaction from './Transaction.js'
import RTCSocket from './RTCSocket.js'
import ChunkProducer from './ChunkProducer.js'
import { wait } from 'observable-class'
import once from './util/once.js'

function debug(...args) {
    if (window?.process?.env?.NODE_ENV === 'production') return
    console.log('[TransactionWriter]', ...args)
}

// 한번에 큰 arraybuffer를 전송시에도 채널이 터질 수 있음
// 따라서 데이터를 청크로 끊어서 보내야 함
const CHUNK_SIZE = 200 * 1024 // 200KB

/*
전체 파이프 구조: 
source -> chunkingStream -> writable --- socket --- readable -> destination
                         |
                 AbortController

 - 전송 완료: writable close 불림 -> socket에서 done 이벤트 발생 -> readable에서 데이터 채널 close 이벤트 기다림 -> 스트림 닫기
                                  -> 데이터 채널 닫음(done 이벤트와 바이너리 데이터의 전송 순서는 지켜지지 않으므로 readable에서 닫을 수 없음)
 - 보내는 쪽에서 중단할때: writable abort 불림 -> socket에서 abort 이벤트 발생 -> readable에서 에러 발생시키고 소켓 닫음
 - 받는 쪽에서 중단할때:  readable cancel 불림 -> socket에서 cancel 이벤트 발생 -> writable에서 에러 발생시키고 소켓 닫음
 - 일시정지(readable): readable에서 'pause', 'resume' 이벤트 발생 -> writable에서 받아서 흐름 조절
*/

export default class TransactionWriter extends Transaction {
    /**
     * 
     * @param {RTCSocket} socket 
     */
    constructor(socket, metadata = { size: 0 }) {
        super(socket, metadata)

        const writable = new WritableStream({
            start: () => {
                // cancel 이벤트 오면 에러 발생시켜서 스트림을 멈춤
                socket.on('cancel', reason => {
                    this.paused = true
                    socket.close()
                    throw new Error('Canceled from receiver: ' + reason)
                })
                // readable측에서 요청하는 pause / resume 이벤트 받기
                socket.on('pause', () => this.pause())
                socket.on('resume', () => this.resume())
            },
            /**
             * 
             * @param {Uint8Array} data 
             */
            write: async data => {
                // 일시정지 기능
                if (this.paused.get()) {
                    await wait(this.paused).toBe(false)
                }

                await socket.write(data.buffer)
                await wait(socket.ready).toBe(true)

                this.processed = this.processed.get() + data.length
            },
            close: async () => {
                // 여기는 위 write가 완료되어야 호출되므로 일단 모든 메시지가 데이터 채널의 버퍼로 들어간 상태
                // 데이터 채널의 버퍼가 비면 닫기(close() 시 버퍼에 있는 메시지는 전송될지 확신할 수 없음)
                if (socket.dataChannel.bufferedAmount > 0) {
                    debug('소켓 닫기 대기중')
                    socket.dataChannel.bufferedAmountLowThreshold = 0
                    await once(socket.dataChannel, 'bufferedamountlow')
                }

                // 전송 완료 이벤트 전달
                socket.writeEvent('done')
                socket.close()
                this.paused = true
                this.done = true
                debug('소켓 닫음')
            },
            // abort되면 abort 이벤트 전달
            abort: async reason => {
                if (reason instanceof Error) {
                    socket.writeEvent('abort', { name: reason.name, message: reason.message })
                } else {
                    socket.writeEvent('abort', reason)
                }

                this.paused = true
                debug('abort됨')
            }
        })

        this.abortController = new AbortController()

        // 이렇게 하면 pipeTo(transactionWriter.stream)처럼 사용 가능
        // 뒤의 catch()문은 abort시 에러가 두군데에서 발생하는데(여기와 this.stream에 pipeTo 한 부분)
        // 여기서 에러가 발생하지 않게 하기 위한 것임
        const chunkingStream = new TransformStream(new ChunkProducer(CHUNK_SIZE))
        chunkingStream.readable.pipeTo(writable, { signal: this.abortController.signal }).catch(() => {})
        this.stream = chunkingStream.writable
    }

    stop() {
        this.abortController.abort()
    }

    pause() {
        super.pause()
        this.socket.writeEvent('pause')
    }

    resume() {
        super.resume()
        this.socket.writeEvent('resume')
    }
}