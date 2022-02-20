import SignalManager from '../../js/SignalManager.js'
import MockSignaler from '../test-util/MockSignaler.js'

describe('SignalManager', function () {
  beforeEach(function () {
    this.signaler = new MockSignaler()
  })

  it('send(msg) 호출 시 시그널러를 통해 메시지를 보내야 함', async function () {
    const signalManager = new SignalManager(this.signaler)
    const msg = {
      type: 'role',
      seed: 0.5
    }
    await signalManager.send(msg)

    expect(this.signaler.send.getCall(0).args[0]).to.deep.equal(msg)
  })

  it('send(msg) 호출 시 메시지에 type 필드가 없으면 에러내야 함', function (done) {
    const signalManager = new SignalManager(this.signaler)
    signalManager.send({ seed: 0.5 }).catch(() => done())
  })

  it('receive(type, callback) 호출 시 해당하는 타입의 메시지가 수신되었을 때 콜백을 호출해야 함', function (done) {
    const signalManager = new SignalManager(this.signaler)
    const msg = {
      type: 'role',
      seed: 0.5
    }

    signalManager.receive('role', received => {
      expect(received).to.equal(msg)
      done()
    })

    this.signaler.emit('message', msg)
  })

  it('receive(type, callback) 호출 시 처리되지 않은 메시지가 있다면 콜백을 호출해야 함', function (done) {
    const signalManager = new SignalManager(this.signaler)
    const msg = {
      type: 'role',
      seed: 0.5
    }

    this.signaler.emit('message', msg)

    signalManager.receive('role', received => {
      expect(received).to.equal(msg)
      done()
    })
  })

  it('ready 속성에 접근 시 시그널러의 ready 속성을 돌려줘야 함', function () {
    // 덮어쓰기 전에는 promise가 ready에 접근할때마다 매번 새로 생성됨
    Object.defineProperty(this.signaler, 'ready', {
      value: Promise.resolve()
    })

    const signalManager = new SignalManager(this.signaler)
    expect(signalManager.ready).to.equal(this.signaler.ready)
  })
})
