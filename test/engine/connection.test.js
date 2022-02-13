import RTCEngine from '../../js/RTCEngine.js'
import { waitAll } from '../../js/util/ObservableClass.js'
import TestSignaler from '../test-util/TestSignaler.js'
import sinon from 'sinon'

const test = it

describe('connection', () => {
  describe('처음 연결할 때', () => {
    test('iceServers를 통해서 stun, turn 설정을 넘겨주면 RTCPerConnection에 반영되어야 함')
    test('autoConnect === true면 RTCEngine 오브젝트 생성 시 연결을 시작해야 함')
    test('autoConnect === false면 connect() 호출 시 연결을 시작해야 함')
    test('assignRole() 호출 시 자동으로 role을 설정해야 함')
    test('start() 호출 시 description과 ice candidate를 전송해야 함')
    test('connect() 호출 시 assignRole(), start()를 호출하고 connectionState가 connected가 되면 리턴해야 함')
    test('connect() 호출 시 role이 수동으로 설정되어 있다면 그걸 사용해야 함')
  })

  describe('재연결 할 때', () => {
    test('connect() 호출 시 ice restart를 시작하고 재연결되면 리턴해야 함')
    describe('connectionState가 failed가 되면', () => {
      test('waitOnlineOnReconnection === false면 바로 재연결을 시도함')
      test('waitOnlineOnReconnection === true고 navigator.onLine === true면 바로 재연결을 시도함')
      test('waitOnlineOnReconnection === true고 navigator.onLine === false면 window의 online 이벤트를 기다렸다 재연결을 시도함')
    })
  })

  describe('연결을 닫을 때', () => {
    test('close() 호출 시 RTC 연결을 해제해야 함')
  })
})

// describe('RTCEngine connection', () => {
//   beforeEach(function () {
//     this.signaler1 = new TestSignaler()
//     this.signaler2 = new TestSignaler()

//     this.signaler1.sendTo = this.signaler2
//     this.signaler2.sendTo = this.signaler1
//   })

//   test('아무 설정을 넘겨주지 않으면 주어진 시그널러로 자동으로 연결', async function () {
//     // 속도 문제로 iceServer 비우기
//     this.engine1 = new RTCEngine(this.signaler1, { iceServers: [] })
//     this.engine2 = new RTCEngine(this.signaler2, { iceServers: [] })

//     await waitAll(wait => {
//       wait(this.engine1.connection).toBe('connected')
//       wait(this.engine2.connection).toBe('connected')
//     })
//   })

//   test('autoConnect: false 옵션을 사용하면 connect() 메소드 호출 시 연결', async function () {
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
