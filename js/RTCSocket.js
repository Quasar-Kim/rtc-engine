import Mitt from './util/Mitt.js'
import once from './util/once.js'

function debug(...args) {
    console.log('[RTCSocket]', ...args)
}

// RTCDataChannel은 실제 버퍼 사이즈를 보여주지 않으나 사이즈를 넘게 데이터가 들어가면 채널이 터져버림
// 따라서 10MB를 데이터 채널의 버퍼 사이즈로 생각
// 또 writable 스트림의 버퍼 사이즈로도 사용
const DATA_CHANNEL_BUFFER_SIZE = 10 * 1024 * 1024 // 10MB

export default class RTCSocket extends Mitt {
    // options - received boolean
    constructor(dataChannel, options = {}) {
        super()

        /** @type {RTCDataChannel} */
        this.dataChannel = dataChannel
        this.dataChannel.binaryType = 'arraybuffer'
        this.dataChannel.addEventListener('message', ({ data }) => this.recvData(data))

        if (options.received) {
            this.writeEvent('__received')
        }
    }

    async writeEvent(eventName, payload) {
        return this.write({
            _channelEngineCustomEvent: true,
            event: eventName,
            payload
        })
    }

    recvData(msg) {
        let data
        if (msg instanceof ArrayBuffer) {
            data = msg
        } else {
            data = JSON.parse(msg)
        }

        // 커스텀 이벤트 처리
        if (data?._channelEngineCustomEvent) {
            this.emit(data.event, data.payload)
        }

        this.emit('data', data)
    }

    /**
     * 
     * @param {object|string|number|ArrayBuffer} data 
     */
    async write(data) {
        if (this.dataChannel.readyState !== 'open') {
            await once(this.dataChannel, 'open')
        }

        let msg
        if (data instanceof ArrayBuffer) {
            // 데이터채널 버퍼 관리
            if (data.byteLength > DATA_CHANNEL_BUFFER_SIZE) {
                throw new Error('data size exceeds datachannel buffer size')
            }

            if (data.byteLength + this.dataChannel.bufferedAmount > DATA_CHANNEL_BUFFER_SIZE) {
                this.dataChannel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_SIZE - data.byteLength
                await once(this.dataChannel, 'bufferedamountlow')
                this.dataChannel.bufferedAmountLowThreshold = 0
            }

            msg = data
            debug('바이너리 데이터 전송함')
        } else {
            msg = JSON.stringify(data)
            debug('메시지 전송함', data)
        }

        this.dataChannel.send(msg)
    }

    close() {
        this.dataChannel.close()
    }
}