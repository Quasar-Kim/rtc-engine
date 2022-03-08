import SignalerBase from '../../js/signaler/Base.js'
import sinon from 'sinon'

export default class MockSignaler extends SignalerBase {
  constructor () {
    super()
    this.ready.set(true)

    this.send = sinon.fake()
    this.start = sinon.fake()
    this.connected = sinon.fake()
    this.disconnected = sinon.fake()
    this.failed = sinon.fake()
    this.close = sinon.fake()
  }
}
