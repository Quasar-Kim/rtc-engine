import SignalerBase from '../../js/signaler/Base.js'
import sinon from 'sinon'

export default class MockSignaler extends SignalerBase {
  constructor () {
    super()
    this.send = sinon.spy()
    this.ready.set(true)
  }
}
