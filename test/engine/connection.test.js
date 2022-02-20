import RTCEngine from '../../js/RTCEngine.js'
import { wait } from '../../js/util/ObservableClass.js'
import TestSignaler from '../test-util/TestSignaler.js'
import sinon from 'sinon'

describe('connection', () => {
  beforeEach(function () {
    this.signaler1 = new TestSignaler()
    this.signaler2 = new TestSignaler()

    this.signaler1.sendTo = this.signaler2
    this.signaler2.sendTo = this.signaler1
  })

  describe('처음 연결할 때', () => {
    it('autoConnect === true면 RTCEngine 오브젝트 생성 시 연결을 시작해야 함', function () {
      const spy = sinon.spy(RTCEngine.prototype, 'connect')
      const engine = new RTCEngine(this.signaler1, { autoConnect: true })

      engine.close()
      spy.restore()

      expect(spy.called).to.equal(true)
    })
    it('autoConnect === false면 connect() 호출 시 연결을 시작해야 함', function () {
      const spy = sinon.spy(RTCEngine.prototype, 'connect')
      const engine = new RTCEngine(this.signaler1, { autoConnect: false })

      engine.close()
      spy.restore()

      expect(spy.called).to.equal(false)
    })
    it('assignRole() 호출 시 자동으로 role을 설정해야 함', async function () {
      const engine = new RTCEngine(this.signaler1, { autoConnect: false })
      this.signaler2.once('message', () => {
        this.signaler2.send({
          type: 'role',
          seed: 10 // 실제 seed는 0~1사이의 난수이므로 반드시 engine이 polite가 됨
        })
      })

      await engine.assignRole()

      engine.close()

      expect(engine.polite).to.equal(true)
    })

    it('connect() 호출 시 role이 수동으로 설정되어 있다면 그걸 사용해야 함', function () {
      const spy = sinon.spy(RTCEngine.prototype, 'assignRole')
      const engine = new RTCEngine(this.signaler1, { autoConnect: false, role: 'polite' })

      engine.close()
      spy.restore()

      expect(engine.polite).to.equal(true)
      expect(spy.called).to.equal(false)
    })
    it('start() 호출 시 description과 ice candidate를 전송해야 함', function (done) {
      const engine = new RTCEngine(this.signaler1, { autoConnect: false, role: 'polite' })

      let receivedDescription = false
      let receivedCandidate = false
      this.signaler2.on('message', msg => {
        if (msg.type === 'description') {
          receivedDescription = true
        } else if (msg.type === 'icecandidate') {
          receivedCandidate = true
        }

        if (receivedDescription && receivedCandidate) {
          engine.close()
          done()
        }
      })

      engine.start()
    })
    it('connect() 호출 시 assignRole(), start()를 호출하고 connectionState가 connected가 되면 리턴해야 함', async function () {
      const connectSpy = sinon.spy(RTCEngine.prototype, 'connect')
      const startSpy = sinon.spy(RTCEngine.prototype, 'start')
      const engine = new RTCEngine(this.signaler1, { autoConnect: false })
      const engine2 = new RTCEngine(this.signaler2)

      await engine.connect()

      expect(connectSpy.called).to.equal(true)
      expect(startSpy.called).to.equal(true)
      expect(engine.connection.get()).to.equal('connected')

      engine.close()
      engine2.close()
      connectSpy.restore()
      startSpy.restore()
    })
  })

  describe('재연결 할 때', () => {
    it('connect() 호출 시 ice restart를 시작해야 함', async function () {
      const peer1 = new RTCEngine(this.signaler1)
      const peer2 = new RTCEngine(this.signaler2)
      await wait(peer1.connection).toBe('connected')

      peer1.connection = 'failed'
      const spy = sinon.spy(RTCEngine.prototype, 'restartIce')
      peer1.connect()

      expect(spy.called).to.equal(true)

      spy.restore()
      peer1.close()
      peer2.close()
    })

    it('role 메시지 수신 시 자신의 role이 정해졌는지와 상관없이 role을 재설정해야 함', async function () {
      const peer1 = new RTCEngine(this.signaler1)
      const peer2 = new RTCEngine(this.signaler2)
      await wait(peer1.connection).toBe('connected')

      // peer1에 role 재설정 요구
      peer2.polite = undefined
      this.signaler1.emit('message', {
        type: 'role',
        seed: 1
      })

      // 한 task 대기
      await new Promise(resolve => setTimeout(resolve))

      peer1.close()
      peer2.close()

      // eslint-disable-next-line no-unused-expressions
      expect(peer1.polite).not.to.be.undefined
      // eslint-disable-next-line no-unused-expressions
      expect(peer2.polite).not.to.be.undefined
    })

    describe('connectionState가 failed가 되면', () => {
      it('waitOnlineOnReconnection === false면 바로 재연결을 시도함', async function () {
        const peer1 = new RTCEngine(this.signaler1, { waitOnlineOnReconnection: false })
        const peer2 = new RTCEngine(this.signaler2, { waitOnlineOnReconnection: false })
        await wait(peer1.connection).toBe('connected')

        const spy = sinon.spy(RTCEngine.prototype, 'restartIce')
        peer1.connection = 'failed'

        // 한 task 대기
        await new Promise(resolve => setTimeout(resolve))

        expect(spy.called).to.equal(true)

        spy.restore()
        peer1.close()
        peer2.close()
      })

      it('waitOnlineOnReconnection === true고 navigator.onLine === true면 바로 재연결을 시도함', async function () {
        const peer1 = new RTCEngine(this.signaler1, { waitOnlineOnReconnection: true })
        const peer2 = new RTCEngine(this.signaler2, { waitOnlineOnReconnection: true })
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

        spy.restore()
        peer1.close()
        peer2.close()
      })
      it('waitOnlineOnReconnection === true고 navigator.onLine === false면 window의 online 이벤트를 기다렸다 재연결을 시도함', async function () {
        const peer1 = new RTCEngine(this.signaler1, { waitOnlineOnReconnection: true })
        const peer2 = new RTCEngine(this.signaler2, { waitOnlineOnReconnection: true })
        await wait(peer1.connection).toBe('connected')

        const spy = sinon.spy(window, 'addEventListener')
        Object.defineProperty(window.navigator, 'onLine', {
          value: false,
          writable: true
        })
        peer1.connection = 'failed' // 재연결 로직이 불림

        // 한 task 대기
        await new Promise(resolve => setTimeout(resolve))

        spy.restore()
        peer1.close()
        peer2.close()
        window.navigator.onLine = true

        expect(spy.getCall(0).args[0]).to.equal('online')
      })
    })
  })
})

// describe('RTCEngine connection', () => {

//   it('아무 설정을 넘겨주지 않으면 주어진 시그널러로 자동으로 연결', async function () {
//     // 속도 문제로 iceServer 비우기
//     this.engine1 = new RTCEngine(this.signaler1, { iceServers: [] })
//     this.engine2 = new RTCEngine(this.signaler2, { iceServers: [] })

//     await waitAll(wait => {
//       wait(this.engine1.connection).toBe('connected')
//       wait(this.engine2.connection).toBe('connected')
//     })
//   })

//   it('autoConnect: false 옵션을 사용하면 connect() 메소드 호출 시 연결', async function () {
//     const spy = sinon.spy(RTCEngine.prototype, 'start')

//     this.engine1 = new RTCEngine(this.signaler1, { autoConnect: false })
//     this.engine2 = new RTCEngine(this.signaler2, { autoConnect: false })

//     expect(spy.called).to.equal(false)
//   })

//   afterEach(function () {
//     this.engine1?.close()
//     this.engine2?.close()
//   })
// })
