import ObservableClass from 'observable-class'
import progressTracker from 'simple-eta'

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
        if (size) {
            this.size = size
            this.progressTracker = progressTracker({ min: 0, max: this.size, autostart: false })
            this.progressTrackerInterval = setInterval(() => {
                // start() 는 사실 report(0)과 동일함
                this.progressTracker.report(this.processed)
            }, 500)
        }
    }

    get eta() {
        return this.progressTracker?.estimate() // 결과는 초
    }

    get progress() {
        return this.processed / this.size * 100
    }

    // TODO: progress per seconds가 정확히 뭔지 알아봐야 함
    get speed() {
        return this.progressTracker?.rate()
    }

    pause() {
        this.paused = true
        this.lastPausedTimestamp = performance.now()
    }

    resume() {
        this.paused = false
        this.pausedMilliSeconds += (performance.now() - this.lastPausedTimestamp)
    }
}