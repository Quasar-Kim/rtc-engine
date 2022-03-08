import Queue from '../../js/util/Queue.js'
import SignalerBase from '../../js/signaler/Base.js'

export default class TestSignaler extends SignalerBase {
  constructor () {
    super()

    this.sendTo = undefined
    this.ready.set(true)
  }

  send (data) {
    this.sendTo.receive(data)
  }
}
