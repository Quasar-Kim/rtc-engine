import TestSignaler from '../test-util/TestSignaler.js'
import sinon from 'sinon'
import RTCEngine from '../../js/RTCEngine.js'
import { createEngine } from '../test-util/engineFactory.js'

describe('signaler API', function () {
  beforeEach(function () {
    this.signaler1 = new TestSignaler()
    this.signaler2 = new TestSignaler()

    this.signaler1.sendTo = this.signaler2
    this.signaler2.sendTo = this.signaler1
  })

  it('엔진의 start() 메소드가 불렸을 때 start() 훅을 호출해야 함', function () {
    sinon.spy(this.signaler1, 'start')
    const engine = createEngine(this.signaler1)

    // engine 생성시 start() 가 자동으로 호출되었어야 함
    expect(this.signaler1.start.called).to.equal(true)
  })

  it('연결이 형성되었을 때 connected() 혹을 호출해야 함', async function () {
    sinon.spy(this.signaler1, 'connected')

    // 일단 연결시키기
    const engine = createEngine(this.signaler1, { autoConnect: false })
    const engine2 = createEngine(this.signaler2)

    await engine.connect()

    expect(this.signaler1.connected.called).to.equal(true)
  })

  it('connectionState가 disconnected가 되면 disconnected() 훅을 호출해야 함')
  it('connectionState가 failed가 되면 failed() 훅을 호출해야 함')

  it('연결이 닫히면 close() 훅을 호출해야 함', async function () {
    sinon.spy(this.signaler1, 'close')

    // 일단 연결시키기
    const engine = createEngine(this.signaler1, { autoConnect: false })
    const engine2 = createEngine(this.signaler2)

    await engine.connect()

    engine.close()

    expect(this.signaler1.close.called).to.equal(true)
  })
})
