import WritableTransaction from '../../js/WritableTransaction.js'
import MockRTCSocket from '../test-util/MockRTCSocket.js'
import { wait } from '../../js/util/ObservableClass.js'
import { expect } from '@esm-bundle/chai'

describe('WritableTransaction', () => {
  beforeEach(function () {
    this.socket = new MockRTCSocket()
    this.transaction = new WritableTransaction(this.socket)
  })

  it('데이터를 받으면 청킹 후 소켓으로 전송해야 함', async function () {
    const data = new Uint8Array(200 * 1024) // 정확히 한 청크와 동일한 사이즈

    const writer = this.transaction.stream.getWriter()
    await writer.ready
    await writer.write(data)

    // 한 task 대기
    await new Promise(resolve => setTimeout(resolve))

    const queuedData = this.socket.write.getCall(0).args[0]
    expect(queuedData.byteLength).to.equal(204800)
  })

  it('상대측의 스트림이 cancel되면 에러를 발생시키고 소켓을 닫아야 함', function (done) {
    this.socket.emit('cancel', 'no reason')

    // writer.write()를 직접 불러서 스트림이 errored 상태인지 확인하기
    const writer = this.transaction.stream.getWriter()
    writer.write()
      .then(() => done('error not thrown'))
      .catch(err => {
        expect(err.message).to.equal('Canceled from receiver: no reason')
        expect(this.socket.close.called).to.equal(true)
        done()
      })
  })

  it('stop() 호출 시 상대방에게 abort 이벤트로 알려야 함', async function () {
    await this.transaction.stop()

    // 한 task 대기
    await new Promise(resolve => setTimeout(resolve))

    expect(this.socket.writeEvent.getCall(0).args[0]).to.equal('abort')
  })

  it('pause() 호출 시 전송을 잠시 멈추고 상대에게도 알려야 함', function () {
    this.transaction.pause()
    expect(this.socket.writeEvent.getCall(0).args[0]).to.equal('pause')
    expect(this.transaction.paused.get()).to.equal(true)
  })

  it('resume() 호출 시 전송을 다시 시작하고 상대에게도 알려야 함', function () {
    this.transaction.pause()
    this.transaction.resume()
    expect(this.socket.writeEvent.getCall(1).args[0]).to.equal('resume')
    expect(this.transaction.paused.get()).to.equal(false)
  })

  it('상대방쪽에서 일시정지시 이쪽도 일시정지 해야 함', async function () {
    await wait(this.transaction.paused).toBe(false)
    this.socket.emit('pause')
    expect(this.transaction.paused.get()).to.equal(true)
  })

  it('상대방쪽에서 재시작 새 이쪽도 재시작해야 함', async function () {
    this.transaction.pause()
    this.socket.emit('resume')
    expect(this.transaction.paused.get()).to.equal(false)
  })

  // 데이터가 진짜 전송중인지 알 수 있는 방법?
  // it('buffer-full 이벤트를 받을 시 데이터 전송을 중단해야 함', async function () {
  //   this.socket.emit('buffer-full')
  //   expect(this.transaction.readableBufferFull.get()).to.equal(true)
  // })

  // it('pull 이벤트를 받을 시 데이터 전송을 재개해야 함', async function () {
  //   this.socket.emit('buffer-full')
  //   this.socket.emit('pull')
  //   expect(this.transaction.readableBufferFull.get()).to.equal(false)
  // })
})
