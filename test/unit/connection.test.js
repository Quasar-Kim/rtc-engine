import RTCEngine from '../../js/RTCEngine.js'
import Mitt from '../../js/util/Mitt.js'
import { wait, waitAll } from '../../js/util/ObservableClass.js'
import sinon from 'sinon'
import Queue from '../../js/util/Queue.js'

const test = it

class TestSignaler extends Mitt {
  constructor () {
    super()

    this.queue = new Queue()
    this.listening = false
    this.sendTo = undefined
  }

  get ready () {
    return Promise.resolve()
  }

  on (evt, callback) {
    super.on(evt, callback)

    if (!this.listening) {
      this.listening = true

      while (this.queue.size > 0) {
        const [evt, payload] = this.queue.pop()
        super.emit(evt, payload)
      }
    }
  }

  emit (evt, payload) {
    if (!this.listening) {
      this.queue.push([evt, payload])
      return
    }

    super.emit(evt, payload)
  }

  send (data) {
    this.sendTo.emit('message', data)
  }
}

describe('RTCEngine connection', () => {
  beforeEach(function () {
    this.signaler1 = new TestSignaler()
    this.signaler2 = new TestSignaler()

    this.signaler1.sendTo = this.signaler2
    this.signaler2.sendTo = this.signaler1
  })

  test('아무 설정을 넘겨주지 않으면 주어진 시그널러로 자동으로 연결', async function () {
    // 속도 문제로 iceServer 비우기
    this.engine1 = new RTCEngine(this.signaler1, { iceServers: [] })
    this.engine2 = new RTCEngine(this.signaler2, { iceServers: [] })

    await waitAll(wait => {
      wait(this.engine1.connection).toBe('connected')
      wait(this.engine2.connection).toBe('connected')
    })
  })

  test('autoConnect: false 옵션을 사용하면 connect() 메소드 호출 시 연결', async function () {
    const spy = sinon.spy(RTCEngine.prototype, 'start')

    this.engine1 = new RTCEngine(this.signaler1, { autoConnect: false })
    this.engine2 = new RTCEngine(this.signaler2, { autoConnect: false })

    expect(spy.called).to.equal(false)
  })

  afterEach(function () {
    this.engine1?.close()
    this.engine2?.close()
  })
})
