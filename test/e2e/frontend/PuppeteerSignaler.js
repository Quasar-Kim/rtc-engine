import SignalerBase from '../../../js/signaler/Base.js'
import './EventChannel.js'

// ์๊ทธ๋๋ฌ
class PuppeteerSignaler extends SignalerBase {
  constructor () {
    super()

    window.eventChannel.on('relay', payload => {
      console.log('[signaler] received:', payload)
      this.emit('message', payload)
    })

    this.ready.set(true)
  }

  send (data) {
    console.log('[signaler] sent:', data)
    window.eventChannel.sendEvent('relay', data)
  }
}

window.signaler = new PuppeteerSignaler()
