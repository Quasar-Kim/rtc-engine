import Transaction from './Transaction.js'
import once from './util/once.js'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[TransactionReader]', ...args)
}

export default class TransactionReader extends Transaction {
  constructor (socket, metadata = { size: 0 }) {
    super(socket, metadata)

    this.stream = new ReadableStream({
      start: controller => {
        socket.on('abort', reason => {
          socket.close()
          throw new Error('Aborted from sender: ' + reason?.message)
        })
        socket.on('data', data => {
          if (!(data instanceof ArrayBuffer)) return

          controller.enqueue(data)
          this.processed = this.processed.get() + data.byteLength
        })
        socket.on('done', async () => {
          await once(socket.dataChannel, 'close')
          controller.close()
          this.done = true
        })
        // writer측에서 일시정지/재개됬을때
        socket.on('pause', () => super.pause())
        socket.on('resume', () => super.resume())
        socket.dataChannel.addEventListener('close', () => {
          this.paused = true
        })
      },
      cancel: reason => this.stop(reason)
    })
  }

  stop (reason = 'User canceled transaction') {
    this.socket.writeEvent('cancel', reason)
    debug('cancel 요청함')
  }

  pause () {
    super.pause()
    this.socket.writeEvent('pause')
  }

  resume () {
    super.resume()
    this.socket.writeEvent('resume')
  }
}
