import ChunkProducer from '../../js/ChunkProducer.js'
import sinon from 'sinon'

describe('ChunkProducer', () => {
  beforeEach(function () {
    this.chunkProducer = new ChunkProducer(10)
  })

  it('내부 버퍼에 공간이 있으면 데이터를 버퍼에 저장해야 함', function () {
    const data = new Uint8Array(5)
    this.chunkProducer.transform(data, {
      enqueue: () => {
        throw new Error('이거 불리면 안됨')
      }
    })

    expect(this.chunkProducer.buffer.bufferedAmount).to.equal(5)
  })

  it('내부 버퍼가 꽉 차면 데이터를 청크로 내보내야 함', function () {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    const fake = sinon.fake()
    this.chunkProducer.transform(data, {
      enqueue: fake
    })

    const firstChunkData = Array.from(fake.getCall(0).args[0])
    expect(firstChunkData).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('flush() 호출 시 내부 버퍼의 남은 데이터를 청크로 내보내야 함', function () {
    const data = new Uint8Array([1])
    const controller = {
      enqueue: sinon.fake()
    }
    this.chunkProducer.transform(data, controller)
    this.chunkProducer.flush(controller)

    const flushedData = Array.from(controller.enqueue.getCall(0).args[0])
    expect(flushedData).to.deep.equal([1])
  })
})
