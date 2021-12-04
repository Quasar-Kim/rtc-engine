import Mitt from './util/Mitt.js'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[Channel]', ...args)
}

export default class Channel extends Mitt {
  /**
   *
   * @param {RTCSocket} socket
   * @param {RTCEngine} engine
   */
  constructor (socket, engine) {
    super()

    this.engine = engine
    this.socket = socket
    this.socket.on('data', data => this.emit('message', data))
    this.label = this.socket.dataChannel.label
    this.filesSent = 0

    debug(this.label, '생성됨')

    this.socket.on('__file-transaction', label => this.receiveTransaction(label))
  }

  async receiveTransaction (label) {
    const transaction = await this.engine.readable(label)
    this.emit('transaction', transaction)
  }

  async send (data) {
    if (data instanceof File) {
      const file = data
      const label = `file - ${this.filesSent++}`
      this.socket.writeEvent('__file-transaction', label)

      const transaction = await this.engine.writable(label, {
        name: file.name,
        size: file.size
      })

      file.stream().pipeTo(transaction.stream)
      return transaction
    }

    return this.socket.write(data)
  }
}
