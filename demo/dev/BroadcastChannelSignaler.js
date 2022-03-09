import SignalerBase from '../../js/signaler/Base.js'

export default class BroadcastChannelSignaler extends SignalerBase {
  constructor () {
    super()
    this.bc = new BroadcastChannel('broadcast-channel-signaler')
    this.ready.set(true)

    this.bc.addEventListener('message', evt => {
      this.receive(JSON.parse(evt.data))
      this.emit('incoming-msg', evt.data)
    })
  }

  async send (data) {
    const msg = JSON.stringify(data)
    this.bc.postMessage(msg)
    this.emit('outgoing-msg', msg)
  }

  close () {
    this.bc.close()
  }
}
