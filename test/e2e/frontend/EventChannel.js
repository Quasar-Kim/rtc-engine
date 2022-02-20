import Mitt from '../../../js/util/Mitt.js'

class EventChannel extends Mitt {
  // 이벤트 보내기
  sendEvent (event, payload) {
    window.sendEvent(event, payload)
  }

  // 이벤트 받기는 없음: puppeteer가 이 오브젝트 직접 조종함
}

window.eventChannel = new EventChannel()
