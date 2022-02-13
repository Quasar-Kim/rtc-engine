import Mitt from '../../js/util/Mitt.js'
import sinon from 'sinon'

export default class MockDataChannel extends Mitt {
  constructor () {
    super()

    this.label = 'mock'
    this.readyState = 'open'
    this.bufferedAmount = 0
    this.send = sinon.fake()
    this.close = sinon.fake()
  }
}
