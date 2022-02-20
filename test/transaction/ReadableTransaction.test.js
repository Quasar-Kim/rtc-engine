import ReadableTransaction from '../../js/ReadableTransaction.js'
import MockRTCSocket from '../test-util/MockRTCSocket.js'
import { wait } from '../../js/util/ObservableClass.js'

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

  // TODO: 이 테스트 통과되도록 API 수정
  // it('상대측의 스트림이 abort되면 에러를 발생시키고 소켓을 닫아야 함', async function () {
  //   expect(() => this.socket.emit('abort', 'no reason')).to.throw('Aborted from sender: no reason')
  //   expect(this.socket.close.called).to.equal(true)
  // })

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
})
