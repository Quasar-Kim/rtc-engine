import Mitt from '../../js/util/Mitt.js'
import sinon from 'sinon'
import { ObservableEntry } from '../../js/util/ObservableEntry.js'
import MockDataChannel from './MockDataChannel.js'

export default class MockRTCSocket extends Mitt {
  constructor () {
    super()

    this.dataChannel = new MockDataChannel()
    this.write = sinon.fake()
    this.writeEvent = sinon.fake()
    this.close = sinon.fake()
    this.recvData = sinon.fake()
    this.ready = new ObservableEntry()
    this.ready = true
  }
}
