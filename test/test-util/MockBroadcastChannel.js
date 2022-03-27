import sinon from 'sinon'

export default class MockBroadcastChannel {
  constructor () {
    this.postMessage = sinon.fake()
    this.close = sinon.fake()
    this.addEventListener = sinon.fake()
    this.removeEventListener = sinon.fake()
    this.dispatchEvent = sinon.fake()
  }
}
