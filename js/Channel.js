import Mitt from './util/Mitt.js'
import Transaction from './Transaction.js'

function debug(...args) {
    console.log('[Channel]', ...args)
}  

export default class Channel extends Mitt {
    constructor(socket) {
        super()
        this.socket = socket
        this.socket.on('data', data => this.emit('message', data))
        this.label = this.socket.dataChannel.label

        debug(this.label, 'constructed')
    }

    send(data, option = { transaction: false }) {
        if (option.transaction) {
            return new Transaction()
        }

        return this.socket.write(data)
    }
}