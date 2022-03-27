import SignalerBase from './Base.js'

/**
 * 한 기기에서 탭끼리 연결하는데 사용할 수 있는 시그널러. `BroadcastChannel`을 이용해 시그널을 주고받습니다.
 */
export default class LocalSignaler extends SignalerBase {
  /**
   * 연결을 시작합니다.
   * @param {object} userConfig
   * @param {number} [userConfig.heartbeatInterval] heartbeat 메시지를 보낼 시간 간격(ms)
   * @param {number} [userConfig.heartbeatTimeout] 마지막으로 heartbeat 메시지를 받은 후 이 시간(ms)동안 heartbeat 메시지를 받지 못하면 연결이 끊긴걸로 간주합니다.
   */
  constructor (userConfig) {
    super()

    // 설정 합치기
    this.config = {
      heartbeatInterval: 1000,
      heartbeatTimeout: 2000
    }
    Object.assign(this.config, userConfig)

    // 통신이 이루어질 broadcast channel 생성
    this.bc = new BroadcastChannel('broadcast-channel-signaler')

    // 주기적으로 heartbeat 메시지 전송
    this.heartbeatIntervalId = setInterval(() => {
      this.bc.postMessage(JSON.stringify({ type: 'heartbeat' }))
    }, this.config.heartbeatInterval)

    // broadcast channel로부터 메시지를 받는 헨들러
    this.bc.addEventListener('message', evt => {
      const msg = JSON.parse(evt.data)

      // heartbeat 메시지를 받으면 연결된걸로 간주
      if (msg.type === 'heartbeat') {
        this.receiveHeartbeat()
        return
      }

      // 디버깅을 위해 incoming-msg 이벤트 발생
      // (heartbeat 메시지는 무시)
      this.emit('incoming-msg', evt.data)

      // 엔진에 메시지 전달
      this.receive(msg)
    })
  }

  /**
   * heartbeat timeout을 겁니다.
   * @private
   */
  setHeartbeatTimeout () {
    this.heartbeatTimeoutId = setTimeout(() => {
      this.ready.set(false)
    }, this.config.heartbeatTimeout)
  }

  /**
   * heartbeat timeout을 취소하고 ready를 false로 설정합니다.
   * @private
   */
  receiveHeartbeat () {
    clearTimeout(this.heartbeatTimeoutId)
    this.ready.set(true)
    this.setHeartbeatTimeout()
  }

  /**
   * 상대에게 메시지를 전송합니다.
   * @param {*} msg 전송할 메시지.
   */
  send (msg) {
    const data = JSON.stringify(msg)
    this.emit('outgoing-msg', data)

    // postMessage는 JSON으로 바꾸지 않아도 오브젝트를 보낼 수 있지만
    // RTCSessionDescription을 보내면 오류가 남, 따라서 JSON으로 바꿔줘야 함
    this.bc.postMessage(data)
  }

  /**
   * close 훅. Broadcast Channel을 닫습니다.
   */
  close () {
    if (this.ready.val === true) {
      clearTimeout(this.heartbeatTimeoutId)
      this.ready.set(false)
    }

    clearInterval(this.heartbeatIntervalId)
    this.bc.close()
  }
}
