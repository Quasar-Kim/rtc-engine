import ReadableTransaction from '../../js/ReadableTransaction.js'
import MockRTCSocket from '../test-util/MockRTCSocket.js'
import { wait } from '../../js/util/ObservableClass.js'
import { expect } from '@esm-bundle/chai'

describe('ReadableTransaction', () => {
  beforeEach(function () {
    this.socket = new MockRTCSocket()
    this.transaction = new ReadableTransaction(this.socket)
  })

  it('소켓에서 데이터를 받으면 그대로 내보내야 함', async function () {
    const data = new ArrayBuffer(5)
    this.socket.emit('data', data)

    const reader = this.transaction.stream.getReader()
    const { value: dataReceived } = await reader.read()

    expect(dataReceived.byteLength).to.equal(5)
  })

  it('상대측의 스트림이 abort되면 에러를 발생시키고 소켓을 닫아야 함', function (done) {
    this.socket.emit('abort', 'no reason')

    const reader = this.transaction.stream.getReader()
    reader.read()
      .then(() => done('no error thrown'))
      .catch(() => {
        expect(this.socket.close.called).to.equal(true)
        done()
      })
  })

  it('stop()시 상대방에게 cancel 이벤트로 알려야 함', async function () {
    this.transaction.stop()

    // 한 task 대기
    await new Promise(resolve => setTimeout(resolve))

    expect(this.socket.writeEvent.getCall(0).args[0]).to.equal('cancel')
  })

  it('pause() 호출 시 전송을 잠시 멈추고 상대에게도 알려야 함 ', function () {
    this.transaction.pause()
    expect(this.socket.writeEvent.getCall(0).args[0]).to.equal('pause')
    expect(this.transaction.paused.get()).to.equal(true)
  })

  it('resume() 호출 시 전송을 다시 시작하고 상대에게도 알려야 함 ', function () {
    this.transaction.pause()
    this.transaction.resume()
    expect(this.socket.writeEvent.getCall(1).args[0]).to.equal('resume')
    expect(this.transaction.paused.get()).to.equal(false)
  })

  it('상대방쪽에서 일시정지시 이쪽도 일시정지 해야 함 ', async function () {
    await wait(this.transaction.paused).toBe(false)
    this.socket.emit('pause')
    expect(this.transaction.paused.get()).to.equal(true)
  })

  it('상대방쪽에서 재시작 새 이쪽도 재시작해야 함 ', async function () {
    this.transaction.pause()
    this.socket.emit('resume')
    expect(this.transaction.paused.get()).to.equal(false)
  })

  it('stream의 internal queue가 모두 차 controller.desiredSize < 0이 되면 buffer-full 이벤트를 보내야 함', function () {
    // 11MiB 데이터 파이핑
    // 참고: stream의 internal queue 사이즈는 10MiB
    const chunk = new ArrayBuffer(1048576)
    for (let i = 0; i < 11; i++) {
      this.socket.emit('data', chunk.slice())
    }

    expect(this.socket.writeEvent.firstCall.firstArg).to.equal('buffer-full')
  })

  it('데이터 전송이 멈춘 상태에서 stream의 pull 콜백이 불린다면 pull 이벤트를 보내야 함', function (done) {
    // 11MiB 데이터 파이핑
    // 참고: stream의 internal queue 사이즈는 10MiB
    const chunk = new ArrayBuffer(1048576)
    for (let i = 0; i < 11; i++) {
      this.socket.emit('data', chunk.slice())
    }

    // 넣은 11개의 청크 모두 빼내기
    let count = 0
    const dest = new WritableStream({
      write: chunk => {
        count++
        if (count === 11) {
          expect(this.socket.writeEvent.lastCall.firstArg).to.equal('pull')
          done()
        }
      }
    })
    this.transaction.stream.pipeTo(dest)
  })
})
