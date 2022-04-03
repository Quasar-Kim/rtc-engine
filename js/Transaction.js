import Mitt from './util/Mitt.js'
import { ObservableEntry, wait } from './util/ObservableEntry.js'
import progressTracker from './util/eta.js'
import prettyBytes from './util/prettyBytes.js'
import createLogger from './util/createLogger.js'

// /** @typedef {import('./RTCSocket.js').default} RTCSocket */

/**
 * 단방향 데이터 전송을 위한 인터페이스. 한 피어에서 다른 피어로 파일과 같은 데이터를 전송할 때 사용됩니다.
 * `stream` 속성을 통해서 읽거나 쓸 수 있는 스트림을 이용할 수 있습니다.
 * 또, 메타데이터 전송 / 전송 컨트롤(일시정지, 재개, 중단) / 전송 속도 및 진행률 추적등의 기능을 제공합니다.
 * 이 클래스는 보내는 쪽과 받는 쪽에서 공통적으로 사용되는 기능을 구현한 베이스로 실제 파일 전송에 관련된 코드는 ReadableTransaction.js와 WritableTransaction.js에 있습니다.
 */
export default class Transaction extends Mitt {
  /**
   * 트렌젝션을 만듭니다.
   * @param {RTCSocket} socket 데이터 전송에 사용할 RTCSocket
   * @param {object} [metadata] 상대에게 전송할 메타데이터. 트렌젝션이 만들어진 후 `metadata` 속성으로 읽을 수 있습니다. Progress Tracking을 사용하려면 `size` 속성이 필요합니다. 그 이외의 속성은 임의로 추가할 수 있습니다.
   * @param {number} [metadata.size] 바이트로 나타낸 트렌젝션의 크기.
   */
  constructor (socket, metadata = {}) {
    super()

    /** @type {RTCSocket} */
    this.socket = socket
    this.metadata = metadata
    this.label = this.socket.label
    this.paused = new ObservableEntry(false)
    this.done = new ObservableEntry(false)

    // 전송 상태 트레킹
    this.lastPausedTimestamp = 0
    this.pausedMilliSeconds = 0
    this.processed = new ObservableEntry(0) // byte or length

    this.timeout = NaN
    this.logger = createLogger(`Transaction:${this.label}`)

    this.initProgressTracking()
  }

  async initProgressTracking () {
    // size가 설정되어 있지 않다면 progress tracking을 사용하지 않음
    if (this.metadata === undefined) {
      this.logger.warn('메타데이터가 undefined입니다. Progress Tracking 기능이 동작하지 않습니다.')
      return
    }
    if (typeof this.metadata.size !== 'number') {
      this.logger.warn('메타데이터의 size 필드가 숫자가 아니거나 정의되지 않았습니다. Progress Tracking 기능이 동작하지 않습니다.')
      return
    }

    await wait(this.processed).toBeChanged()

    // transaction writer 쪽에선 처음 시작부터 속도 측정시
    // 데이터 채널의 버퍼가 다 차기 전이라 속도가 비정상적으로 빠르게 측정되므로 1초 후 시작
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (this.done.get()) return

    const processed = this.processed.get()
    this.progressTracker = progressTracker({
      min: processed,
      max: this.metadata.size + processed,
      historyTimeConstant: 10
    })

    this.timeout = setInterval(() => {
      if (this.paused.get()) return

      const timestamp = Date.now() - this.pausedMilliSeconds
      this.progressTracker.report(this.processed.get(), timestamp)

      const report = {
        processed: this.processed.get(),
        progress: this.progress,
        eta: this.eta,
        speed: this.speed
      }

      this.logger.debug('통계 데이터를 생성했습니다.', report)
      this.emit('report', report)
    }, 500)
  }

  get eta () {
    if (!this.progressTracker) {
      return NaN
    }

    if (this.paused.get()) {
      return Math.round(this.progressTracker.estimate(this.lastPausedTimestamp))
    }

    if (this.processed.get() === this.metadata.size) {
      return 0
    }

    return Math.round(this.progressTracker.estimate(Date.now() - this.pausedMilliSeconds)) // 결과는 초
  }

  get progress () {
    return this.processed.get() / this.metadata.size
  }

  get speed () {
    if (!this.progressTracker) {
      return 'NaNB/s'
    }

    if (this.paused.get()) {
      return '0B/s'
    }

    return prettyBytes(this.progressTracker.rate()) + '/s'
  }

  pause () {
    this.logger.debug('트렌젝션이 일시중지되었습니다.')
    this.paused.set(true)
    this.lastPausedTimestamp = Date.now()
  }

  resume () {
    this.logger.debug('트렌젝션이 재시작되었습니다.')
    this.paused.set(false)
    this.pausedMilliSeconds += (Date.now() - this.lastPausedTimestamp)
  }

  stopReport () {
    this.logger.debug('통계 데이터 생성이 중단되었습니다.')
    if (isNaN(this.timeout)) return
    clearInterval(this.timeout)
  }
}
