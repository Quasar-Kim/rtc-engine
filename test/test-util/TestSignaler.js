import Mitt from '../../js/util/Mitt.js'
import Queue from '../../js/util/Queue.js'

export default class TestSignaler extends Mitt {
  constructor () {
    super()

    this.queue = new Queue()
    this.listening = false
    this.sendTo = undefined
  }

  get ready () {
    return Promise.resolve()
  }

  on (evt, callback) {
    super.on(evt, callback)

    if (!this.listening) {
      this.listening = true

      while (this.queue.size > 0) {
        const [evt, payload] = this.queue.pop()
        super.emit(evt, payload)
      }
    }
  }

  emit (evt, payload) {
    if (!this.listening) {
      this.queue.push([evt, payload])
      return
    }

    super.emit(evt, payload)
  }

  send (data) {
    this.sendTo.emit('message', data)
  }
}
