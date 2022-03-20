import Queue from './Queue.js'
import once from './once.js'

export default class ObservableQueue extends Queue {
  async * pushes () {
    let lastTail = 0

    while (true) {
      await once(this, 'push')

      for (let i = lastTail; i < this.tail; i++) {
        yield this.data[i]
      }
      lastTail = this.tail
    }
  }
}
