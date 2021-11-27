import ObservableClass from 'observable-class'
import progressTracker from 'simple-eta'
import prettyBytes from 'pretty-bytes'

function debug(...args) {
    console.log('[Transaction]', ...args)
}

export default class Transaction extends ObservableClass {
    static observableProps = ['paused']

    constructor(socket) {
        super()
        
        /** @type {RTCDataChannel} */
        this.socket = socket
        this.paused = false
        this.metadata = {}

        // 전송 상태 트레킹
        this.lastPausedTimestamp = 0
        this.pausedMilliSeconds = 0
        this.processed = 0 // byte or length
    }

    // data가 File이면 사이즈 속성이 사용됨
    // 그렇지 않으면 options.size가 사용됨
    startProgressTracking(size) {
        // 사이즈를 알수 있는 경우 progressTracker 사용
        this.size = size
        this.progressTracker = progressTracker({ min: 0, max: this.size, historyTimeConstant: 30 })
        this.progressTrackerInterval = setInterval(() => {
            if (this.paused.get()) return

            const timestamp = Date.now() - this.pausedMilliSeconds
            // debug(this.processed, timestamp, '에 레포트됨')
            this.progressTracker.report(this.processed, timestamp)
        }, 100)
    }

    get eta() {
        if (this.paused.get()) {
            return Math.round(this.progressTracker?.estimate(this.lastPausedTimestamp))
        }

        return Math.round(this.progressTracker?.estimate(Date.now() - this.pausedMilliSeconds)) // 결과는 초
    }

    get progress() {
        return Math.round(this.processed / this.size * 100)
    }

    get speed() {
        if (this.paused.get()) {
            return '0B/s'
        }

        return prettyBytes(this.progressTracker?.rate()) + '/s'
    }

    pause() {
        this.paused = true
        this.lastPausedTimestamp = Date.now()
    }

    resume() {
        this.paused = false
        this.pausedMilliSeconds += (Date.now() - this.lastPausedTimestamp)
    }
}