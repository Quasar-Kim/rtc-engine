import EventEmitter from 'events'

// page <-> puppeteer 통신용
export default class EventChannel extends EventEmitter {
  constructor (page) {
    super()
    this.page = page
  }

  // 이벤트 받기
  async init () {
    return this.page.exposeFunction('sendEvent', (event, payload) => {
      this.emit(event, payload)
    })
  }

  // 이벤트 보내기
  async sendEvent (event, payload) {
    return this.page.evaluate(
      (evt, pl) => window.eventChannel.emit(evt, pl),
      event,
      payload
    )
  }
}
