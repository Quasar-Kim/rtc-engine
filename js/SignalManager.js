import Mitt from './util/Mitt.js'
import Queue from './util/Queue.js'
import { wait } from './util/ObservableClass.js'

export default class SignalManager extends Mitt {
  constructor (signaler) {
    super()
    this.signaler = signaler
    this.unhandledMsgs = new Map()
    this.messageHandler = msg => {
      // TODO: 에러 던지기

      // 이벤트 헨들러가 없다면 메시지 unhandledMsgs에 추가하기
      // 있다면 콜백 호출
      if (this.all.has(msg.type)) {
        this.emit(msg.type, msg)
      } else {
        // 큐가 없다면 만들기
        if (!this.unhandledMsgs.has(msg.type)) {
          this.unhandledMsgs.set(msg.type, new Queue())
        }

        // 큐에 메시지 추가
        const msgQueue = this.unhandledMsgs.get(msg.type)
        msgQueue.push(msg)
      }
    }
    this.signaler.on('message', this.messageHandler)
  }

  async send (msg) {
    if (!('type' in msg)) {
      throw new Error('전송할 메시지가 "type" 필드를 포함하지 않습니다.')
    }

    await wait(this.signaler.ready).toBe(true)
    this.signaler.send(msg)
  }

  receive (type, callback) {
    // role에 해당하는 이벤트 핸들러 추가
    this.on(type, callback)

    // type이 일치하는 처리되지 않은 메시지가 있으면 바로 콜백 호출
    if (this.unhandledMsgs.has(type)) {
      const msgQueue = this.unhandledMsgs.get(type)
      while (msgQueue.size > 0) {
        const msg = msgQueue.pop()
        this.emit(type, msg)
      }
    }
  }

  async callHook (hookName) {
    const hookFn = this.signaler[hookName]

    // 훅이 정의되지 않았을수도 있으므로 확인
    if (typeof hookFn !== 'function') return

    await hookFn.apply(this.signaler, [this])
  }

  get ready () {
    return this.signaler.ready
  }

  clear () {
    this.all.clear()
    this.signaler.off('message', this.messageHandler)
  }
}
