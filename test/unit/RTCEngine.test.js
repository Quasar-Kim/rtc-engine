import RTCEngine from '../../js/RTCEngine.js'
import { wait } from '../../js/util/ObservableClass.js'
import TestSignaler from '../test-util/TestSignaler.js'
import { createEngine } from '../test-util/engineFactory.js'
import sinon from 'sinon'
import { expect } from '@esm-bundle/chai'

describe('RTCEngine', () => {
  beforeEach(function () {
    this.signaler1 = new TestSignaler()
    this.signaler2 = new TestSignaler()

    this.signaler1.sendTo = this.signaler2
    this.signaler2.sendTo = this.signaler1
  })

  describe('처음 연결할 때', () => {
    it('autoConnect === true면 RTCEngine 오브젝트 생성 시 연결을 시작해야 함', function () {
      const spy = sinon.spy(RTCEngine.prototype, 'connect')
      const engine = createEngine(this.signaler1, { autoConnect: true })

      expect(spy.called).to.equal(true)
    })

    it('autoConnect === false면 connect() 호출 시 연결을 시작해야 함', function () {
      const spy = sinon.spy(RTCEngine.prototype, 'connect')
      const engine = createEngine(this.signaler1, { autoConnect: false })

      expect(spy.called).to.equal(false)
    })

    it('assignRole() 호출 시 자동으로 role을 설정해야 함', async function () {
      const engine = createEngine(this.signaler1, { autoConnect: false })
      this.signaler2.once('role', () => {
        this.signaler2.send({
          type: 'role',
          seed: 10 // 실제 seed는 0~1사이의 난수이므로 반드시 engine이 polite가 됨
        })
      })

      await engine.assignRole()

      expect(engine.polite.get()).to.equal(true)
    })

    it('connect() 호출 시 role이 수동으로 설정되어 있다면 그걸 사용해야 함', function () {
      const spy = sinon.spy(RTCEngine.prototype, 'assignRole')
      const engine = createEngine(this.signaler1, { autoConnect: false, role: 'polite' })

      expect(engine.polite.get()).to.equal(true)
      expect(spy.called).to.equal(false)
    })

    it('start() 호출 시 description과 ice candidate를 전송해야 함', async function () {
      const engine = createEngine(this.signaler1, { role: 'polite' })

      await Promise.all([
        new Promise(resolve => this.signaler2.once('description', () => resolve())),
        new Promise(resolve => this.signaler2.once('icecandidate', () => resolve()))
      ])
    })

    it('connect() 호출 시 assignRole(), start()를 호출하고 connectionState가 connected가 되면 리턴해야 함', async function () {
      const connectSpy = sinon.spy(RTCEngine.prototype, 'connect')
      const startSpy = sinon.spy(RTCEngine.prototype, 'start')
      const engine = createEngine(this.signaler1, { autoConnect: false })
      const engine2 = createEngine(this.signaler2)

      await engine.connect()

      expect(connectSpy.called).to.equal(true)
      expect(startSpy.called).to.equal(true)
      expect(engine.connection.get()).to.equal('connected')
    })
  })

  describe('소켓 생성', function () {
    beforeEach(async function () {
      this.engine = createEngine(this.signaler1)
      this.engine2 = createEngine(this.signaler2)

      await wait(this.engine.connection).toBe('connected')
    })

    it('같은 레이블로 socket() 호출 시 소켓 생성', function (done) {
      let callCount = 0
      const callback = () => {
        callCount++
        if (callCount === 2) {
          done()
        }
      }

      this.engine.socket('my-socket').then(callback)
      this.engine2.socket('my-socket').then(callback)
    })

    it('레이블 없이 socket() 호출 시 sockets() 제네레이터로 소켓을 받으면 소켓 생성', function (done) {
      let callCount = 0
      const callback = () => {
        callCount++
        if (callCount === 2) {
          done()
        }
      }

      this.engine2.socket().then(callback)
      this.engine.sockets().next().then(callback)
    })
  })

  describe('트렌젝션 생성', function () {
    beforeEach(async function () {
      this.engine = createEngine(this.signaler1)
      this.engine2 = createEngine(this.signaler2)

      await wait(this.engine.connection).toBe('connected')
    })

    it('같은 레이블로 각각 readable(), writable() 호출 시 트렌젝션 쌍 생성', async function () {
      const [tx1, tx2] = await Promise.all([
        this.engine.readable('my-transaction'),
        this.engine2.writable('my-transaction')
      ])

      expect(tx1.label).to.equal(tx2.label)
    })

    it('레이블 없이 transaction() 호출 시 readables() 제네레이터로 트렌젝션을 받으면 소켓 생성', async function () {
      const [tx1, k] = await Promise.all([
        this.engine.writable(),
        this.engine2.readables().next()
      ])
      const tx2 = k.value

      expect(tx1.label).to.equal(tx2.label)
    })
  })

  describe('재연결 할 때', () => {
    it('connect() 호출 시 ice restart를 시작해야 함', async function () {
      const peer1 = createEngine(this.signaler1)
      const peer2 = createEngine(this.signaler2)
      await wait(peer1.connection).toBe('connected')

      peer1.connection = 'failed'
      const spy = sinon.spy(RTCEngine.prototype, 'restartIce')
      peer1.connect()

      expect(spy.called).to.equal(true)
    })

    it('role 메시지 수신 시 자신의 role이 정해졌는지와 상관없이 role을 재설정해야 함', async function () {
      const peer1 = createEngine(this.signaler1)
      const peer2 = createEngine(this.signaler2)
      await wait(peer1.connection).toBe('connected')

      // peer1에 role 재설정 요구
      peer2.polite = undefined
      this.signaler1.emit('message', {
        type: 'role',
        seed: 1
      })

      // 한 task 대기
      await new Promise(resolve => setTimeout(resolve))

      // eslint-disable-next-line no-unused-expressions
      expect(peer1.polite).not.to.be.undefined
      // eslint-disable-next-line no-unused-expressions
      expect(peer2.polite).not.to.be.undefined
    })

    describe('connectionState가 failed가 되면', () => {
      it('waitOnlineOnReconnection === false면 바로 재연결을 시도함', async function () {
        const peer1 = createEngine(this.signaler1, { waitOnlineOnReconnection: false })
        const peer2 = createEngine(this.signaler2, { waitOnlineOnReconnection: false })
        await wait(peer1.connection).toBe('connected')

        const spy = sinon.spy(RTCEngine.prototype, 'restartIce')
        peer1.connection = 'failed'

        // 한 task 대기
        await new Promise(resolve => setTimeout(resolve))

        expect(spy.called).to.equal(true)
      })

      it('waitOnlineOnReconnection === true고 navigator.onLine === true면 바로 재연결을 시도함', async function () {
        const peer1 = createEngine(this.signaler1, { waitOnlineOnReconnection: true })
        const peer2 = createEngine(this.signaler2, { waitOnlineOnReconnection: true })
        await wait(peer1.connection).toBe('connected')

        const spy = sinon.spy(RTCEngine.prototype, 'restartIce')
        Object.defineProperty(window.navigator, 'onLine', {
          value: true,
          writable: true
        })
        peer1.connection = 'failed' // 재연결 로직이 불림

        // 한 task 대기
        await new Promise(resolve => setTimeout(resolve))

        expect(spy.called).to.equal(true)
      })

      it('waitOnlineOnReconnection === true고 navigator.onLine === false면 window의 online 이벤트를 기다렸다 재연결을 시도함', async function () {
        // const peer1 = createEngine(this.signaler1, { waitOnlineOnReconnection: true })
        const peer1 = createEngine(this.signaler1, { waitOnlineOnReconnection: true })
        const peer2 = createEngine(this.signaler2, { waitOnlineOnReconnection: true })
        await wait(peer1.connection).toBe('connected')

        const spy = sinon.spy(window, 'addEventListener')
        Object.defineProperty(window.navigator, 'onLine', {
          value: false,
          writable: true
        })
        peer1.connection = 'failed' // 재연결 로직이 불림

        // 한 task 대기
        await new Promise(resolve => setTimeout(resolve))

        window.navigator.onLine = true

        expect(spy.getCall(0).args[0]).to.equal('online')
      })
    })
  })

  describe('플러그인', () => {
    it('plugin() 호출 시 플러그인 함수를 RTCEngine 클래스를 첫번째 인자로 호출해야 함', function (done) {
      RTCEngine.plugin(Engine => {
        expect(Engine).to.equal(RTCEngine)
        done()
      })
    })
  })
})
