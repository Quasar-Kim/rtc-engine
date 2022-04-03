/**
 * 리셋 가능한 interval.
 */
export default class IntervalTimer {
  /**
   * Timer 인스턴스를 생성합니다.
   * `autoStart` 옵션이 `false`가 아니라면 자동으로 interval을 예약합니다.
   * @param {Function} callback interval마다 실행할 함수
   * @param {number} interval callback의 실행 간격(ms)
   * @param {object} options
   * @param {boolean} [options.autoStart] 자동으로 interval을 예약할지 결정
   */
  constructor (callback, interval, options) {
    /**
     * interval마다 실행할 함수
     * @type {Function}
     */
    this.callback = callback

    /**
     * `this.callback`의 실행 간격(ms)
     * @type {number}
     */
    this.interval = interval

    /**
     * `setInterval()`의 리턴값. `clearInterval()` 호출에 필요.
     * @type {number}
     */
    this.intervalID = NaN

    // 옵션 받기
    this.options = {
      autoStart: true
    }
    Object.assign(this.options, options)

    if (this.options.autoStart) {
      this.set()
    }
  }

  /**
   * 주기적으로 callback을 실행하는 interval을 예약합니다.
   */
  set () {
    this.intervalID = setInterval(this.callback, this.interval)
  }

  /**
   * 예약되어 있는 interval을 취소하고 재예약합니다.
   */
  reset () {
    this.clear()
    this.set()
  }

  /**
   * 예약되어 있는 interval을 취소합니다.
   */
  clear () {
    clearInterval(this.intervalID)
  }
}
