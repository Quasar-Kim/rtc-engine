import ObservableClass from './util/ObservableClass.js'
import once from './util/once.js'

// RTCDataChannel은 실제 버퍼 사이즈를 보여주지 않으나 사이즈를 넘게 데이터가 들어가면 채널이 터져버림
// 따라서 10MB를 데이터 채널의 버퍼 사이즈로 생각
// 또 writable 스트림의 버퍼 사이즈로도 사용
const DATA_CHANNEL_BUFFER_SIZE = 10 * 1024 * 1024 // 10MB

export default class RTCSocket extends ObservableClass {
  static get observableProps () {
    return ['ready']
  }

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
      this.ready = false
      console.log(`[RTCSocket:${this.label}] 상대에 의해서 소켓 닫힘`)
    })
    this.label = this.dataChannel.label

    // 앞의 메시지가 버퍼 사이즈 문제로 인해 대기 중이라면 이게 true로 설정됨
    // 뒤의 메시지는 이 속성이 false가 되면 처리됨
    this.ready = true
    this.closed = false

    if (options.received) {
      this.writeEvent('__received')
    }
  }

  async writeEvent (eventName, payload) {
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
    } else {
      data = JSON.parse(msg)
      console.log(`[RTCSocket:${this.label}] 메시지 받음`, data)
    }

    // 커스텀 이벤트 처리
    if (data?._channelEngineCustomEvent) {
      this.emit(data.event, data.payload)
      return
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
        throw new Error('data size exceeds datachannel buffer size')
      }

      if (data.byteLength + this.dataChannel.bufferedAmount > DATA_CHANNEL_BUFFER_SIZE) {
        this.ready = false
        this.dataChannel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_SIZE - data.byteLength
        await once(this.dataChannel, 'bufferedamountlow')
        this.dataChannel.bufferedAmountLowThreshold = 0
      }

      msg = data
      console.log(`[RTCSocket:${this.label}] 바이너리 데이터 전송함`)
    } else {
      msg = JSON.stringify(data)
      console.log(`[RTCSocket:${this.label}] 메시지 전송함`)
    }

    if (this.dataChannel.readyState !== 'open') {
      await once(this.dataChannel, 'open')
    }

    this.dataChannel.send(msg)
    this.ready = true
  }

  close () {
    this.dataChannel.close()
    this.ready = false
    this.closed = true
    console.log(`[RTCSocket:${this.label}] 소켓 닫음`)
  }
}
