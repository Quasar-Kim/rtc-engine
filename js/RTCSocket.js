import Mitt from './util/Mitt.js'
import { ObservableEntry } from './util/ObservableEntry.js'
import once from './util/once.js'
import createLogger from './util/createLogger.js'

// RTCDataChannel은 실제 버퍼 사이즈를 보여주지 않으나 사이즈를 넘게 데이터가 들어가면 채널이 터져버림
// 따라서 10MB를 데이터 채널의 버퍼 사이즈로 생각
// 또 writable 스트림의 버퍼 사이즈로도 사용
const DATA_CHANNEL_BUFFER_SIZE = 10 * 1024 * 1024 // 10MB

export default class RTCSocket extends Mitt {
  // options - received boolean
  constructor (dataChannel, options = {}) {
    super()

    /** @type {RTCDataChannel} */
    this.dataChannel = dataChannel
    this.dataChannel.binaryType = 'arraybuffer'
    this.dataChannel.addEventListener('message', ({ data }) => this.recvData(data))
    this.dataChannel.addEventListener('close', () => {
      this.emit('close')

      if (this.closed) return

      // close() 호출 이외의 이유로 닫힌 경우
      this.ready.set(false)
      this.logger.log('🚫 상대방에 의해서 소켓이 닫혔습니다.')
    })
    this.label = this.dataChannel.label

    // 앞의 메시지가 버퍼 사이즈 문제로 인해 대기 중이라면 이게 true로 설정됨
    // 뒤의 메시지는 이 속성이 false가 되면 처리됨
    this.ready = new ObservableEntry(true)
    this.closed = false

    this.logger = createLogger(`Socket:${this.label}`)

    if (options.received) {
      this.writeEvent('__received')
    }
  }

  async writeEvent (eventName, payload) {
    this.logger.debug(`커스텀 이벤트 ${eventName} 전송을 요청했습니다. 페이로드:`, payload)
    return this.write({
      _channelEngineCustomEvent: true,
      event: eventName,
      payload
    })
  }

  recvData (msg) {
    let data
    if (msg instanceof ArrayBuffer) {
      data = msg
      this.logger.debug('이진 데이터를 전송받았습니다. 사이즈:', msg.byteLength)
    } else {
      data = JSON.parse(msg)
      this.logger.debug('데이터를 전송받았습니다.', data)
    }

    // 커스텀 이벤트 처리
    if (typeof data === 'object') {
      if ('_channelEngineCustomEvent' in data) {
        this.emit(data.event, data.payload)
        return
      }
    }

    this.emit('data', data)
  }

  /**
     *
     * @param {object|string|number|ArrayBuffer} data
     */
  async write (data) {
    let msg
    if (data instanceof ArrayBuffer) {
      // 데이터채널 버퍼 관리
      if (data.byteLength > DATA_CHANNEL_BUFFER_SIZE) {
        throw new Error('데이터 크기가 데이터 채널의 버퍼 사이즈보다 커서 전송할 수 없습니다.')
      }

      if (data.byteLength + this.dataChannel.bufferedAmount > DATA_CHANNEL_BUFFER_SIZE) {
        this.ready.set(false)
        this.dataChannel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_SIZE - data.byteLength
        this.logger.debug(`버퍼에 공간이 확보되기를 대기하는 중입니다. 메시지 사이즈: ${data.byteLength}, 버퍼 공간: ${DATA_CHANNEL_BUFFER_SIZE - this.dataChannel.bufferedAmount}`)
        await once(this.dataChannel, 'bufferedamountlow')
        this.logger.debug('버퍼에 공간이 확보되었습니다.')
        this.dataChannel.bufferedAmountLowThreshold = 0
      }

      msg = data
      this.logger.debug('이진 데이터를 전송했습니다. 사이즈:', msg.byteLength)
    } else {
      msg = JSON.stringify(data)
      this.logger.debug('데이터를 전송했습니다. ', data)
    }

    if (this.dataChannel.readyState !== 'open') {
      await once(this.dataChannel, 'open')
    }

    this.dataChannel.send(msg)
    this.ready.set(true)
  }

  close () {
    this.dataChannel.close()
    this.ready.set(false)
    this.closed = true
    this.logger.log('🚫 close() 메소드가 호출되서 소켓을 닫았습니다.')
  }
}
