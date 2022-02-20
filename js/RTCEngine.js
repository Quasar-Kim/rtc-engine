import ObservableMap from './util/ObservableMap.js'
import ObservableClass, { wait, observe } from './util/ObservableClass.js'
import RTCSocket from './RTCSocket.js'
import once from './util/once.js'
import Channel from './Channel.js'
import TransactionWriter from './TransactionWriter.js'
import TransactionReader from './TransactionReader.js'
import ListenerManager from './util/ListenerManager.js'
import SignalManager from './SignalManager.js'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[RTCEngine]', ...args)
}

/**
 * RTC 연결을 관리하는 엔진.
 */
export default class RTCEngine extends ObservableClass {
  static get observableProps () {
    return ['connection']
  }

  /**
   * RTCEngine을 생성합니다. autoConnect 옵션이 true일경우(기본값) 자동으로 연결을 시작합니다.
   * @param {*} signaler 메시지 송수신에 사용할 시그널러.
   * @param {object} userOptions
   * @param {boolean} [userOptions.autoConnect] RTCEngine 생성시 자동 연결 여부를 결정하는 옵션.
   * @param {RTCIceServer[]} [userOptions.iceServers] 연결에 사용할 ICE 서버들.
   * @param {'polite'|'impolite'} [userOptions.role] 연결에서 이 피어의 역할을 수동으로 설정함.
   * @param {boolean} [userOptions.waitOnlineOnReconnection] 재연결시 인터넷이 연결될때까지 대기했다가 연결함.
   */
  constructor (signaler, userOptions = {}) {
    super()

    // 옵션 합치기
    const signalerOptions = signaler.options ?? {}
    this.options = {
      autoConnect: true,
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] }
      ],
      waitOnlineOnReconnection: true,
      ...signalerOptions,
      ...userOptions
    }

    debug('사용할 옵션:', this.options)

    // role 설정
    // 만약 options.role이 설정되어 있지 않다면 assignRole()을 이용해 자동으로 role을 설정함
    if (this.options.role) {
      if (!['polite', 'impolite'].includes(this.options.role)) {
        throw new Error(`config.role이 잘못 설정되었습니다. 현재 설정은 '${this.options.role}'입니다. 올바른 값은 'polite' 또는 'impolite'입니다.`)
      }
      this.polite = this.options.role === 'polite'
    }

    // 내부 property 설정
    this.pc = new RTCPeerConnection({
      iceServers: this.options.iceServers
    })
    this.dataChannels = new ObservableMap()
    this.makingOffer = false // offer collision 방지를 위해 offer을 만드는 동안이면 기록
    this.ignoreOffer = false // offer collision 방지를 위해 role이나 signalingState등에 기반해 받은 offer을 받을지 결정
    this.connection = 'inactive' // 연결의 상태를 나타냄. inactive를 제외하고는 RTCPeerConnection의 connectionState와 동일함. inactive / connecting / connected / disconnected / failed
    this.listenerManager = new ListenerManager() // 이벤트 리스너들을 정리하기 위해서 사용
    this.signalManager = new SignalManager(signaler)
    this.seed = Math.random() // role 배정을 위한 난수

    // 자동 연결
    if (this.options.autoConnect) {
      this.connect()
    }
  }

  /**
   * 무작위로 두 피어의 역할을 정합니다. 여기서 역할은 Perfect Negotiation Pattern에서 사옹되는 polite/impolite 피어를 의미합니다.
   * @returns {Promise<void>} 역할 배정이 끝나면 resolve되는 promise
   */
  assignRole () {
    // role 설정 시나리오
    // 1. 처음 연결할때: 서로 자신의 시드를 보내고 상대의 시드를 받아 각자의 role을 설정함.
    // 2. 재연결 시 한쪽(B)이 새로고침 된 경우: B에서 시드를 보내면 A는 자신의 role을 초기화하고 자신의 시드를 보냄.
    // 어떤 경우이든지 서로 시드를 교환하게 됨.
    return new Promise(resolve => {
      const sendRoleSeed = () => {
        this.signalManager.send({
          type: 'role',
          seed: this.seed
        })
      }

      this.signalManager.receive('role', msg => {
        const remoteSeed = msg.seed

        // role이 설정되어 있는 경우
        if (this.polite !== undefined) {
          this.polite = undefined
          sendRoleSeed()
        }

        // role이 설정되어 있지 않은 경우
        if (remoteSeed === this.seed) {
          // 시드 충돌 발생시 자신의 시드를 바꿔서 전송
          this.seed = Math.random()
          sendRoleSeed()
        } else if (remoteSeed > this.seed) {
          this.polite = true
          resolve()
        } else {
          this.polite = false
          resolve()
        }
      })

      sendRoleSeed()
    })
  }

  /**
   * 엔진을 시작합니다. 시작시 Perfect Negotiation Pattern을 이용해 상대방과 RTC를 형성 및 관리합니다.
   * 연결이 끊어질 경우 인터넷이 다시 연결될때까지 대기했다가 ice restart를 시도합니다. 이때 메시지가 성공적으로 교환된다면 연결이 다시 형성됩니다.
   */
  async start () {
    // 1. 이벤트 핸들러 설치
    // 아래 내부 함수들은 모두 this로 RTCEngine 인스턴스에 접근할 수 있게 하기 위해
    // 모두 화살표 함수임

    // role 메시지를 받은 경우
    // role이 설정되어 있지 않으면: 양쪽 다 role이 설정되어 있지 않다는 걸 의미. 즉 둘다 재연결이 아닌 처음으로 연결하는 것.
    //   이 경우 start() 호출 시 role 설정 메시지가 아래에서 보내질 것이므로 답장할 필요 없음.
    // role이 설정되어 있는 경우: 둘 중 한쪽이 새로고침 된 경우 발생할 수 있음. 이 경우에는 답장을 보내서
    //   role을 재설정해야 함
    const sendLocalDescription = async () => {
      try {
        this.makingOffer = true
        await this.pc.setLocalDescription()
        console.groupCollapsed('creating offer')
        this.signalManager.send({
          type: 'description',
          description: this.pc.localDescription
        })
        console.groupEnd()
      } finally {
        this.makingOffer = false
      }
    }

    const sendIceCandidate = rtcIceCandidate => {
      console.groupCollapsed('sending ice candidate')
      this.signalManager.send({
        type: 'icecandidate',
        candidate: rtcIceCandidate.candidate
      })
      console.groupEnd('sending ice candidate')
    }

    const setDescription = async description => {
      debug('receiving description', description)
      const makingOffer = this.makingOffer
      const offerCollision = description.type === 'offer' && (makingOffer || this.pc.signalingState !== 'stable')
      this.ignoreOffer = !this.polite && offerCollision

      if (offerCollision) {
        console.groupCollapsed('offer collision')
        debug('was making offer', makingOffer)
        debug('signaling state', this.pc.signalingState)
      }

      if (this.ignoreOffer) {
        debug('ignoring offer')
        console.groupEnd()
        return
      }

      debug('accepting description')
      console.groupEnd()

      await this.pc.setRemoteDescription(description)
      if (description.type === 'offer') {
        await this.pc.setLocalDescription()
        console.groupCollapsed('making answer')
        this.signalManager.send({
          type: 'description',
          description: this.pc.localDescription
        })
        console.groupEnd()
      }
    }

    const setIceCandidate = async candidate => {
      try {
        debug('receiving candidate', candidate)
        await this.pc.addIceCandidate(candidate)
      } catch (err) {
        if (!this.ignoreOffer) {
          throw err
        }
        debug('ignoring candidate because ignoreOffer is set to true')
      }
    }

    const updateConnectionState = () => {
      debug('connection state', this.pc.connectionState)
      this.connection = this.pc.connectionState
    }

    const saveDataChannelsToMap = ({ channel }) => {
      this.dataChannels.set(channel.label, channel)
    }

    const logIceConnectionStateChange = () => {
      debug('ice connection state', this.pc.iceConnectionState)
    }

    this.listenerManager.add(this.pc, 'negotiationneeded', sendLocalDescription)
    this.listenerManager.add(this.pc, 'icecandidate', sendIceCandidate)
    this.listenerManager.add(this.pc, 'connectionstatechange', updateConnectionState)
    this.listenerManager.add(this.pc, 'iceconnectionstatechange', logIceConnectionStateChange)
    this.listenerManager.add(this.pc, 'datachannel', saveDataChannelsToMap)

    // this.pc.addEventListener('negotiationneeded', sendLocalDescription)
    // this.pc.addEventListener('icecandidate', sendIceCandidate)
    // this.pc.addEventListener('connectionstatechange', updateConnectionState)
    // this.pc.addEventListener('iceconnectionstatechange', logIceConnectionStateChange)
    // this.pc.addEventListener('datachannel', saveDataChannelsToMap)

    this.signalManager.receive('description', msg => setDescription(msg.description))
    this.signalManager.receive('icecandidate', msg => setIceCandidate(msg.candidate))

    // 2. 연결 시작
    // 먼저 role 설정하기
    if (this.polite === undefined) {
      await this.assignRole()
      debug('polite', this.polite)
    }

    // 데이터 채널 만들면 연결 시작
    if (this.polite) {
      this.pc.createDataChannel('RTCEngine_initiator')
    }

    // 3. 재연결
    // connection이 failed이고, 인터넷에 연결되어 있고, 시그널러가 준비되어 있을 때 ice restart를 시도함
    observe(this.connection).onChange(() => {
      if (this.connection.get() !== 'failed') return

      const reconnect = async () => {
        debug('시그널러 ready 대기중')
        await this.signalManager.ready
        this.restartIce()
        debug('재연결 시도하는 중...')
      }

      if (navigator.onLine || !this.options.waitOnlineOnReconnection) {
        reconnect()
      } else {
        debug('오프라인 상태, 인터넷 연결 대기 중')
        this.listenerManager.add(window, 'online', reconnect, { once: true })
      }
    })
  }

  /**
   * 연결을 시작하고, 연결이 성공할때까지 기다립니다.
   * 또 navigator.onLine이 false인 상태에서 수동으로 재연결을 시도하기 위해서도 사용됩니다.
   * @returns {Promise<void>} 연결이 성공하면 resolve하는 promise
   */
  async connect () {
    if (this.connection.get() === 'failed') {
      this.restartIce()
    } else if (this.connection.get() === 'inactive') {
      this.start()
    }

    return wait(this.connection).toBe('connected')
  }

  /**
   * 양쪽 피어에서 사용 가능한 RTCSocket을 엽니다. 양쪽 피어 모두 동일한 식별자로 이 메소드를 호출하면 RTCSocket이 만들어집니다.
   * @param {string} label 소켓을 식별하기 위한 식별자. __중복이 불가능합니다.__ (RTCDataChannel과는 다릅니다)
   * @returns {Promise<RTCSocket>} RTCSocket이 만들어지면 그걸 resolve하는 promise
   */
  async socket (label) {
    // polite가 채널을 만드는 이유는 없음. 그냥 정한거.
    if (this.polite) {
      const dataChannel = this.pc.createDataChannel(label)
      const socket = new RTCSocket(dataChannel)
      await once(socket, '__received')
      return socket
    } else {
      let dataChannel
      if (this.dataChannels.has(label)) {
        dataChannel = this.dataChannels.get(label)
      } else {
        // start() 안에서 pc의 'datachannel' 이벤트 발생시 this.dataChannels에 레이블을 키로 RTCDataChannel을 넣음
        dataChannel = await this.dataChannels.wait(label).toBeDefined()
      }

      return new RTCSocket(dataChannel, { received: true })
    }
  }

  /**
   * 데이터를 받기 위한 트렌젝션을 만듭니다. 양쪽 피어 모두 동일한 식별자로 이 메소드를 호출하면 트렌젝션이 만들어집니다.
   * @param {string} label 트렌젝션을 식별하기 위한 식별자. __중복이 불가능합니다.__ (RTCDataChannel과는 다릅니다)
   * @returns {Promise<TransactionReader>} 트렌젝션이 만들어지면 그걸 resolve하는 promise
   */
  async readable (label) {
    const socket = await this.socket(label)
    const metadata = await once(socket, 'metadata')
    const transaction = new TransactionReader(socket, metadata)
    socket.writeEvent('__transaction-ready')
    return transaction
  }

  /**
   * 데이터를 보내기 위한 트렌젝션을 만듭니다. 양쪽 피어 모두 동일한 식별자로 이 메소드를 호출하면 트렌젝션이 만들어집니다.
   * @param {string} label 트렌젝션을 식별하기 위한 식별자. __중복이 불가능합니다.__ (RTCDataChannel과는 다릅니다)
   * @returns {Promise<TransactionWriter>} 트렌젝션이 만들어지면 그걸 resolve하는 promise
   */
  async writable (label, metadata) {
    const socket = await this.socket(label)
    socket.writeEvent('metadata', metadata)
    await once(socket, '__transaction-ready')
    return new TransactionWriter(socket, metadata)
  }

  /**
   * 양방향 데이터 전송을 위한 채널을 엽니다. 양쪽 피어 모두 동일한 식별자로 이 메소드를 호출하면 채널이 만들어집니다.
   * @param {string} label 채널을 식별하기 위한 식별자. __중복이 불가능합니다.__ (RTCDataChannel과는 다릅니다)
   * @returns {Promise<Channel>} 채널이 만들어지면 그걸 resolve하는 promise
   */
  async channel (label) {
    const socket = await this.socket(label)
    return new Channel(socket, this)
  }

  /**
   * RTCPeerConnection의 restartIce를 호출합니다. 재연결을 위해서는 connect()를 사용하세요.
   */
  restartIce () {
    this.pc.restartIce()
    debug('ICE 재시작됨')
  }

  /**
   * 연결을 닫습니다. 두 피어 사이에 형성된 모든 연결(트렌젝션, 채널 등)이 닫힙니다.
   * 이 메소드를 호출한 후 엔진은 garbage collect될 수 있게 됩니다.
   */
  close () {
    // TODO: connection 속성 업데이트 위해 closed 이벤트 대기하고 pc를 치워야 함
    this.pc.close()
    this.pc = null
    this.dataChannels.clear()
    this.listenerManager.clear()
    this.signalManager.clear()
    debug('RTC 연결 닫음')
  }

  /**
   * 소켓이 사용하는 데이터 채널의 레포트를 가져옵니다.
   * @param {RTCSocket} socket 레포트를 읽고 싶은 대상 소켓
   * @returns {RTCStatsReport} 소켓이 사용하는 데이터 채널의 레포트
   */
  async getReport (socket) {
    for (const [, report] of await this.pc.getStats()) {
      if (report.type === 'data-channel' && report.dataChannelIdentifier === socket.dataChannel.id) {
        return report
      }
    }
  }

  /**
   * 플러그인을 사용합니다.
   * @param {Function} plugin 플러그인 함수. 첫번째 인자로 RTCEngine 클래스가 전달됩니다. 플러그인 함수는 프로토타입을 통해 원하는 메소드를 추가할 수 있습니다.
   */
  static plugin (plugin) {
    if (typeof plugin !== 'function') {
      throw new Error('only function-style plugin is supported')
    }

    plugin(RTCEngine)
  }
}
