import MockSignaler from '../test-util/MockSignaler.js'
import TestSignaler from '../test-util/TestSignaler.js'
import { createEngine } from '../test-util/engineFactory.js'
import { expect } from '@esm-bundle/chai'
import sinon from 'sinon'

describe('signaler API', function () {
  beforeEach(function () {
    this.signaler1 = new TestSignaler()
    this.signaler2 = new TestSignaler()

    this.signaler1.sendTo = this.signaler2
    this.signaler2.sendTo = this.signaler1
  })

  it('엔진의 start() 메소드가 불렸을 때 start() 훅을 호출해야 함', function () {
    const signaler = new MockSignaler()
    // role을 수동으로 줘서 assignRole()단계 건너뛰기
    const engine = createEngine(signaler, { role: 'impolite' })

    // engine 생성시 start() 가 자동으로 호출되었어야 함
    expect(signaler.start.called).to.equal(true)
  })

  it('연결이 형성되었을 때 connected() 혹을 호출해야 함', async function () {
    sinon.replace(this.signaler1, 'connected', sinon.fake())

    // 일단 연결시키기
    const peer1 = createEngine(this.signaler1, { autoConnect: false })
    const peer2 = createEngine(this.signaler2)

    await peer1.connect()

    expect(this.signaler1.connected.called).to.equal(true)
  })

  it('connectionState가 disconnected가 되면 disconnected() 훅을 호출해야 함', async function () {
    sinon.replace(this.signaler1, 'disconnected', sinon.fake())

    // 일단 연결시키기
    const peer1 = createEngine(this.signaler1, { autoConnect: false })
    const peer2 = createEngine(this.signaler2)

    await peer1.connect()

    // 강제로 상태 바꿔버리기
    peer1.connection.set('disconnected')

    expect(this.signaler1.disconnected.called).to.equal(true)
  })

  it('connectionState가 failed가 되면 failed() 훅을 호출해야 함', async function () {
    sinon.replace(this.signaler1, 'failed', sinon.fake())

    // 일단 연결시키기
    const peer1 = createEngine(this.signaler1, { autoConnect: false })
    const peer2 = createEngine(this.signaler2)

    await peer1.connect()

    // 강제로 상태 바꿔버리기
    peer1.connection.set('failed')

    expect(this.signaler1.failed.called).to.equal(true)
  })

  it('연결이 닫히면 close() 훅을 호출해야 함', async function () {
    const signaler = new MockSignaler()
    const engine = createEngine(signaler)

    engine.close()

    expect(signaler.close.called).to.equal(true)
  })
})
