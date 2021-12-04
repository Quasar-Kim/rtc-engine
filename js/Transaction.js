import ObservableClass, { wait } from './util/ObservableClass.js'
import progressTracker from 'simple-eta'
import prettyBytes from 'pretty-bytes'

// eslint-disable-next-line no-unused-vars
function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[Transaction]', ...args)
}

/** @typedef {import('./RTCSocket.js').default} RTCSocket */

/**
 * 단방향 데이터 전송을 위한 인터페이스. 한 피어에서 다른 피어로 파일과 같은 데이터를 전송할 때 사용됩니다.
 * `stream` 속성을 통해서 읽거나 쓸 수 있는 스트림을 이용할 수 있습니다.
 * 또, 메타데이터 전송 / 전송 컨트롤(일시정지, 재개, 중단) / 전송 속도 및 진행률 추적등의 기능을 제공합니다.
 * 이 클래스는 보내는 쪽과 받는 쪽에서 공통적으로 사용되는 기능을 구현한 베이스로 실제 파일 전송에 관련된 코드는 TransactionReader.js와 TransactionWriter.js에 있습니다.
 */
export default class Transaction extends ObservableClass {
  static get observableProps () {
    return ['paused', 'processed', 'done']
  }

  /**
   * 주의: 이 생성자는 RTCEngine 내부에서만 호출되어야 합니다.
   * @param {RTCSocket} socket 데이터 전송에 사용할 RTCSocket
   * @param {*} [metadata] 상대에게 전송할 메타데이터. 트렌젝션이 만들어진 후 `metadata` 속성으로 읽을 수 있습니다. 
   */
  constructor (socket, metadata = { size: 0 }) {
    super()

    /** @type {RTCDataChannel} */
    this.socket = socket
    this.paused = false
    this.metadata = metadata
    this.done = false

    // 전송 상태 트레킹
    this.lastPausedTimestamp = 0
    this.pausedMilliSeconds = 0
    this.processed = 0 // byte or length

    this.initProgressTracking()
  }

  async initProgressTracking () {
    await wait(this.processed).toBeChanged()

    // transaction writer 쪽에선 처음 시작부터 속도 측정시
    // 데이터 채널의 버퍼가 다 차기 전이라 속도가 비정상적으로 빠르게 측정되므로 1초 후 시작
    await new Promise(resolve => setTimeout(resolve, 1000))

    const processed = this.processed.get()
    this.progressTracker = progressTracker({
      min: processed,
      max: this.metadata.size + processed,
      historyTimeConstant: 10
    })

    const timeout = setInterval(() => {
      if (this.paused.get()) return

      const timestamp = Date.now() - this.pausedMilliSeconds
      this.progressTracker.report(this.processed.get(), timestamp)
      // debug(this.processed.get(), timestamp, '에 레포트됨')

      if (this.processed.get() === this.metadata.size) {
        clearInterval(timeout)
      }
    }, 100)
  }

  get eta () {
    if (!this.progressTracker) {
      return NaN
    }

    if (this.paused.get()) {
      return Math.round(this.progressTracker?.estimate(this.lastPausedTimestamp))
    }

    return Math.round(this.progressTracker?.estimate(Date.now() - this.pausedMilliSeconds)) // 결과는 초
  }

  get progress () {
    return Math.round(this.processed.get() / this.metadata.size * 100)
  }

  get speed () {
    if (!this.progressTracker) {
      return 'NaNB/s'
    }

    if (this.paused.get()) {
      return '0B/s'
    }

    return prettyBytes(this.progressTracker?.rate()) + '/s'
  }

  pause () {
    this.paused = true
    this.lastPausedTimestamp = Date.now()
  }

  resume () {
    this.paused = false
    this.pausedMilliSeconds += (Date.now() - this.lastPausedTimestamp)
  }
}
