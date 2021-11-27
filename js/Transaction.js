import ObservableClass, { wait, observe } from 'observable-class'
import progressTracker from 'simple-eta'
import prettyBytes from 'pretty-bytes'

function debug(...args) {
    console.log('[Transaction]', ...args)
}

export default class Transaction extends ObservableClass {
    static observableProps = ['paused', 'processed', 'done']

    constructor(socket, metadata = { size: 0 }) {
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

    async initProgressTracking() {
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

    get eta() {
        if (!this.progressTracker) {
            return NaN
        }

        if (this.paused.get()) {
            return Math.round(this.progressTracker?.estimate(this.lastPausedTimestamp))
        }

        return Math.round(this.progressTracker?.estimate(Date.now() - this.pausedMilliSeconds)) // 결과는 초
    }

    get progress() {
        return Math.round(this.processed.get() / this.metadata.size * 100)
    }

    get speed() {
        if (!this.progressTracker) {
            return 'NaNB/s'
        }

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