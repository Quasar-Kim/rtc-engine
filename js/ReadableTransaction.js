import Transaction from './Transaction.js'

export default class ReadableTransaction extends Transaction {
  constructor (socket, metadata = { size: 0 }) {
    super(socket, metadata)

    this.bufferFullInformed = false
    this.aborted = false
    this.canceled = false
    this.cancelReason = null

    this.stream = new ReadableStream({
      start: controller => {
        const isDone = () => this.processed.get() === metadata.size

        socket.on('data', data => {
          if (!(data instanceof ArrayBuffer)) return

          controller.enqueue(data)
          this.processed = this.processed.get() + data.byteLength

          if (controller.desiredSize < 0 && !this.bufferFullInformed) {
            this.bufferFullInformed = true
            socket.writeEvent('buffer-full')
          }

          if (isDone()) {
            socket.close()
            controller.close()
            this.done = true
          }
        })

        socket.once('close', () => {
          this.stopReport()
          if (this.aborted || isDone()) return

          if (this.canceled) {
            if (this.cancelReason instanceof Error) {
              controller.error(this.cancelReason)
            } else {
              controller.error('Transaction canceled: ' + this.cancelReason)
            }
          }

          controller.error(new Error('Socket has been closed unexpectedly'))
        })

        socket.once('abort', errMsg => {
          this.aborted = true
          socket.close()
          controller.error(new Error('Transaction aborted: ' + errMsg))
        })

        // writer측에서 일시정지/재개됬을때
        socket.on('pause', () => super.pause())
        socket.on('resume', () => super.resume())
      },
      pull: () => {
        if (!this.bufferFullInformed) return

        socket.writeEvent('pull')
        this.bufferFullInformed = false
      },
      cancel: reason => {
        this.cancel(reason)
      }
    }, new ByteLengthQueuingStrategy({ highWaterMark: 10 * 1024 * 1024 /* 10 MB */ }))
  }

  cancel (reason = '') {
    this.canceled = true
    this.cancelReason = reason

    if (reason instanceof Error) {
      this.socket.writeEvent('cancel', reason.message)
    } else {
      this.socket.writeEvent('cancel', reason)
    }

    console.log(`[Transaction:${this.label}] cancel됨`)
  }

  stop () {
    this.cancel('stop() called by receiver')
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
