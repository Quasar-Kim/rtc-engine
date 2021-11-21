import Transaction from './Transaction.js'
import once from './util/once.js'

export default class TransactionReader extends Transaction {
    constructor(socket, options = {}) {
        super(socket)

        const size = options?.size
        let isFirstChunk = true
        
        this.stream = new ReadableStream({
            start: controller => {
                socket.on('abort', reason => {
                    this.socket.close()
                    throw new Error('Aborted from sender: ' + reason)
                })
                socket.on('data', data => {
                    if (!(data instanceof ArrayBuffer)) return
                    
                    if (isFirstChunk) {
                        isFirstChunk = false
                        this.startProgressTracking(size)
                    }

                    controller.enqueue(data)
                })
                socket.on('done', async () => {
                    await once(socket.dataChannel, 'close')
                    controller.close()
                })
            },
            cancel: this.stop
        })
    }

    stop(reason = '') {
        this.socket.writeEvent('cancel', reason)
    }

    pause() {
        super.pause()
        this.socket.writeEvent('pause')
    }

    resume() {
        super.resume()
        this.socket.writeEvent('resume')
    }
}