export default class Queue {
  constructor () {
    this.head = 0
    this.tail = 0
    this.data = {}
  }

  push (val) {
    const index = this.tail++
    this.data[index] = val
  }

  pop () {
    const index = this.head++
    const val = this.data[index]
    delete this.data[index]
    return val
  }

  get size () {
    return this.tail - this.head
  }

  * [Symbol.iterator] () {
    for (let i = this.head; i < this.tail; i++) {
      yield this.data[i]
    }
  }

  flush () {
    this.head = 0
    this.tail = 0
    this.data = {}
  }
}
