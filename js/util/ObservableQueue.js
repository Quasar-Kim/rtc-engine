import Queue from './Queue.js'
import once from './once.js'

export default class ObservableQueue extends Queue {
  async * pushes () {
    while (true) {
      const pushed = await once(this, 'push')
      yield pushed
    }
  }
}
