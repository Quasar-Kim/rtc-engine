import Transaction from '../../js/Transaction.js'
import MockRTCSocket from '../test-util/MockRTCSocket.js'

async function fakeSending () {
  // 시작된지 1초 후 속도에 접근 가능, 따라서 1500ms 대기
  await new Promise(resolve => setTimeout(resolve, 1500))

  // 약 500ms 간격으로 10씩 2회 증가 시키기
  for (let i = 0; i < 2; i++) {
    this.transaction.processed = this.transaction.processed.get() + 10
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

xdescribe('Transaction', function () {
  this.timeout(5000)

  beforeEach(function () {
    this.socket = new MockRTCSocket()
    this.transaction = new Transaction(this.socket, { size: 100 })
  })

  it('전송 중 eta 속성 접근 시 남은 초를 리턴해야 함', async function () {
    await fakeSending.call(this)

    // eslint-disable-next-line no-unused-expressions
    expect(this.transaction.eta).to.be.a('number').and.not.NaN
  })

  it('전송이 일시정지됬을때 eta 속성 접근 시 마지막으로 계산된 값을 리턴해야 함', async function () {
    await fakeSending.call(this)
    const lastEta = this.transaction.eta
    this.transaction.pause()

    await new Promise(resolve => setTimeout(resolve, 500))

    expect(this.transaction.eta).to.equal(lastEta)
  })

  // TODO: 테스트 통과하도록 코드 수정
  // it('progress 속성 접근 시 전송 진행률을 리턴해야 함', function () {
  //   this.transaction.processed = 60
  //   expect(this.transaction.progress).to.equal(0.6)
  // })

  it('전송 중 speed 속성 접근 시 전송 속도를 리턴해야 함', async function () {
    await fakeSending.call(this)

    const rate = parseInt(this.transaction.speed)
    // eslint-disable-next-line no-unused-expressions
    expect(rate).to.be.a('number').and.not.NaN
  })
})
