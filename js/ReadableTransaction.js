import Transaction from './Transaction.js'
// import once from './util/once.js'

export default class ReadableTransaction extends Transaction {
  constructor (socket, metadata = { size: 0 }) {
    super(socket, metadata)

    this.bufferFull = false
    this.stream = new ReadableStream({
      start: controller => {
        socket.on('data', data => {
          if (!(data instanceof ArrayBuffer)) return

          controller.enqueue(data)
          this.processed = this.processed.get() + data.byteLength

          if (controller.desiredSize < 0) {
            this.bufferFull = true
            socket.writeEvent('buffer-full')
          }
        })

        socket.on('close', async () => {
          controller.close()
          this.done = true
        })

        socket.on('abort', () => {
          socket.close()
          controller.error(new Error('Stream aborted'))
        })

        // writer측에서 일시정지/재개됬을때
        socket.on('pause', () => super.pause())
        socket.on('resume', () => super.resume())
        socket.dataChannel.addEventListener('close', () => {
          this.paused = true
        })
      },
      pull: () => {
        if (!this.bufferFull) return

        socket.writeEvent('pull')
        this.bufferFull = false
      },
      cancel: reason => this.stop(reason)
    }, new ByteLengthQueuingStrategy({ highWaterMark: 10 * 1024 * 1024 /* 10 MiB */ }))
  }

  stop () {
    this.socket.writeEvent('cancel')
    console.log('[ReadableTransaction] cancel 요청함')
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
