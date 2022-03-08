import Queue from '../../../js/util/Queue.js'
import { expect } from '@esm-bundle/chai'

describe('Queue', () => {
  it('push() 호출 시 데이터를 가장 뒤에 저장해야 함', () => {
    const queue = new Queue()
    queue.push(1)
    queue.push(2)

    const index = queue.tail - 1
    expect(queue.data[index]).to.equal(2)
  })
  it('pop() 호출 시 가장 앞의 데이터를 빼고 리턴해야 함', () => {
    const queue = new Queue()
    queue.push(1)
    queue.push(2)

    expect(queue.pop()).to.equal(1)
  })
  it('size 속성 접근 시 데이터의 개수를 리턴해야 함', () => {
    const queue = new Queue()
    queue.push(1)
    queue.push(2)
    queue.push(3)
    queue.pop()

    expect(queue.size).to.equal(2)
  })
  it('flush() 호출 시 모든 데이터를 비워야 함', () => {
    const queue = new Queue()
    queue.push(1)
    queue.push(2)
    queue.flush()

    expect(queue.data).to.deep.equal({})
    expect(queue.size).to.equal(0)
  })
  it('iterator 이용 시 들어온 순서대로 데이터를 yield 해야 함', () => {
    const queue = new Queue()
    queue.push(1)
    queue.push(2)

    const iter = queue[Symbol.iterator]()
    expect(iter.next().value).to.equal(1)
    expect(iter.next().value).to.equal(2)
  })
})
