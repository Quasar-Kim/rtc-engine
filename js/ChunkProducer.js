class FixedSizeBuffer {
  constructor (size) {
    this.size = size
    this.source = new Uint8Array(size)
    this.bufferedAmount = 0
    this.desiredAmount = size
  }

  consume (source) {
    const sourceBytes = source.length
    let consumedBytes

    if (sourceBytes > this.desiredAmount) {
      this.source.set(source.subarray(0, this.desiredAmount), this.bufferedAmount)
      consumedBytes = this.desiredAmount
    } else {
      this.source.set(source, this.bufferedAmount)
      consumedBytes = sourceBytes
    }

    this.bufferedAmount += consumedBytes
    this.desiredAmount -= consumedBytes

    return consumedBytes
  }

  flush () {
    return this.source.slice(0, this.bufferedAmount)
  }

  get full () {
    return this.desiredAmount === 0
  }
}

export default class ChunkProducer {
  constructor (size) {
    this.size = size
    this.buffer = new FixedSizeBuffer(this.size)
  }

  /**
     *
     * @param {Uint8Array} chunk
     * @param {*} controller
     */
  transform (chunk, controller) {
    if (!(chunk instanceof Uint8Array)) {
      controller.enqueue(chunk)
    }

    let processedBytes = 0
    let subarray = chunk
    while (processedBytes < chunk.length) {
      processedBytes += this.buffer.consume(subarray)
      if (this.buffer.full) {
        controller.enqueue(this.buffer.source)
        // TODO: FixedSizeBuffer 재사용?
        this.buffer = new FixedSizeBuffer(this.size)
        subarray = chunk.subarray(processedBytes)
      }
    }
  }

  flush (controller) {
    // 마지막 chunk는 사이즈가 일정하지 않음
    const chunk = this.buffer.flush()
    if (chunk) {
      controller.enqueue(chunk)
    }
  }
}
