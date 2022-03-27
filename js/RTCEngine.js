import RTCSocket from './RTCSocket.js'
import once from './util/once.js'
import Channel from './Channel.js'
import WritableTransaction from './WritableTransaction.js'
import ReadableTransaction from './ReadableTransaction.js'
import ObservableMap from './util/ObservableMap.js'
import ListenerManager from './util/ListenerManager.js'
import ObservableQueue from './util/ObservableQueue.js'
import Mitt from './util/Mitt.js'
import { ObservableEntry, wait, observe } from './util/ObservableEntry.js'

const UNNEGOTIATED_SOCKET_PREFIX = 'RTCEngine-unnegotiated-socket'
const UNNEGOTIATED_TRANSACTION_PREFIX = 'RTCEngine-unnegotiated-transaction'

/**
 * RTC 연결을 관리하는 엔진.
 */
export default class RTCEngine extends Mitt {
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
    const signalerOptions = signaler.options
    this.options = {
      autoConnect: true,
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] }
      ],
      waitOnlineOnReconnection: true,
      ...signalerOptions,
      ...userOptions
    }

    console.log('[RTCEngine]', '사용할 옵션:', this.options)

    // role 설정
    // 만약 options.role이 설정되어 있지 않다면 나중에 start() 호출 시 assignRole()을 이용해 자동으로 role을 설정함
    if (this.options.role) {
      if (!['polite', 'impolite'].includes(this.options.role)) {
        throw new Error(`config.role이 잘못 설정되었습니다. 현재 설정은 '${this.options.role}'입니다. 올바른 값은 'polite' 또는 'impolite'입니다.`)
      }
    }

    // 내부 property 설정

    /**
     * perfect negotiation pattern에서 사용하는 role
     */
    this.polite = new ObservableEntry(this.options.role ? this.options.role === 'polite' : undefined)

    /**
     * 피어 커넥션 객체
     */
    this.pc = new RTCPeerConnection({
      iceServers: this.options.iceServers
    })

    /**
     * 상대방이 socket()을 레이블과 함께 호출한 결과 이쪽에서 받은 데이터 채널들.
     * 키: 레이블
     * 값: 소켓이 사용할 데이터 채널(RTCDataChannel)
     */
    this.negotiatedDataChannels = new ObservableMap()

    /**
     * 상대방이 socket()을 레이블 없이 호출한 결과 이쪽에서 받은 데이터 채널들.
     */
    this.unnegotiatedDataChannels = new ObservableQueue()

    /**
     * 상대방이 writable()을 레이블 없이 호출한 결과 이쪽에서 받은 데이터 채널들
     */
    this.unnegotiatedTransactions = new ObservableQueue()

    /**
     * offer collision 방지를 위해 offer을 만드는 동안이면 기록
     */
    this.makingOffer = false

    /**
     * offer collision 방지를 위해 role이나 signalingState등에 기반해 받은 offer을 받을지 결정
     */
    this.ignoreOffer = false

    /**
     * 연결의 상태를 나타냄. inactive, closed를 제외하고는 RTCPeerConnection의 connectionState와 동일함.
     * @type {ObservableEntry<'inactive'|'connecting'|'connected'|'disconnected'|'failed'|'closed'>}
     */
    this.connection = new ObservableEntry('inactive')

    /**
     * 외부 API에 건 이벤트 리스너들을 관리하는 객체
     */
    this.listenerManager = new ListenerManager()

    /**
     * 메시지를 전달하는데 사용되는 시그널러
     */
    this.signaler = signaler

    /**
     * role 배정을 위한 난수
     */
    this.seed = Math.random()

    /**
     * 연결이 닫혔는지 나타내는 속성
     */
    this.closed = new ObservableEntry(false)

    /**
     * 이때까지 생성된 unnegotiated socket의 개수.
     * unnegotiated socket 생성시 레이블을 만들 때 사용됩니다. (예시: RTCEngine-unnegotiated-socket_0)
     */
    this.unnegotiatedSocketCount = 0

    /**
     * 이때까지 생성된 unnegotiated transaction의 개수.
     */
    this.unnegotiatedTransactionCount = 0

    // 자동 연결
    if (this.options.autoConnect) {
      this.connect()
    }
  }

  /**
   * 무작위로 두 피어의 역할을 정합니다. 여기서 역할은 Perfect Negotiation Pattern에서 사옹되는 polite/impolite 피어를 의미합니다.
   * @private
   * @returns {Promise<void>} 역할 배정이 끝나면 resolve되는 promise
   */
  assignRole () {
    // role 설정 시나리오
    // 1. 처음 연결할때: 서로 자신의 시드를 보내고 상대의 시드를 받아 각자의 role을 설정함.
    // 2. 재연결 시 한쪽(B)이 새로고침 된 경우: B에서 시드를 보내면 A는 자신의 role을 초기화하고 자신의 시드를 보냄.
    // 어떤 경우이든지 서로 시드를 교환하게 됨.
    return new Promise(resolve => {
      const sendRoleSeed = () => {
        this.signaler.send({
          type: 'role',
          seed: this.seed
        })
      }

      this.signaler.on('role', msg => {
        const remoteSeed = msg.seed

        // role이 설정되어 있는 경우
        if (this.polite.get() !== undefined) {
          this.polite.set(undefined)
          sendRoleSeed()
        }

        // role이 설정되어 있지 않은 경우
        if (remoteSeed === this.seed) {
          // 시드 충돌 발생시 자신의 시드를 바꿔서 전송
          this.seed = Math.random()
          sendRoleSeed()
        } else if (remoteSeed > this.seed) {
          this.polite.set(true)
          resolve()
        } else {
          this.polite.set(false)
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
        this.signaler.send({
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
      this.signaler.send({
        type: 'icecandidate',
        candidate: rtcIceCandidate.candidate
      })
      console.groupEnd('sending ice candidate')
    }

    const setDescription = async description => {
      console.log('[RTCEngine]', 'description 받음', description)
      const makingOffer = this.makingOffer
      const offerCollision = description.type === 'offer' && (makingOffer || this.pc.signalingState !== 'stable')
      this.ignoreOffer = !this.polite.get() && offerCollision

      if (offerCollision) {
        console.groupCollapsed('offer collision 발생함')
        console.log('[RTCEngine]', 'makingOffer:', makingOffer)
        console.log('[RTCEngine]', 'signaling state:', this.pc.signalingState)
      }

      if (this.ignoreOffer) {
        console.log('[RTCEngine]', '상대의 offer를 무시함')
        console.groupEnd()
        return
      }

      console.log('[RTCEngine]', '상대의 offer를 받음')
      console.groupEnd()

      await this.pc.setRemoteDescription(description)
      if (description.type === 'offer') {
        await this.pc.setLocalDescription()
        console.groupCollapsed('making answer')
        this.signaler.send({
          type: 'description',
          description: this.pc.localDescription
        })
        console.groupEnd()
      }
    }

    const setIceCandidate = async candidate => {
      try {
        console.log('[RTCEngine]', 'ice candidate 받음', candidate)
        await this.pc.addIceCandidate(candidate)
      } catch (err) {
        if (!this.ignoreOffer) {
          throw err
        }
      }
    }

    const updateConnectionState = () => {
      console.log('[RTCEngine]', 'connection state:', this.pc.connectionState)
      this.connection.set(this.pc.connectionState)
    }

    const saveDataChannels = ({ channel: dataChannel }) => {
      if (dataChannel.label.startsWith(UNNEGOTIATED_SOCKET_PREFIX)) {
        this.unnegotiatedSocketCount++
        this.unnegotiatedDataChannels.push(dataChannel)
      } else if (dataChannel.label.startsWith(UNNEGOTIATED_TRANSACTION_PREFIX)) {
        this.unnegotiatedTransactionCount++
        this.unnegotiatedTransactions.push(dataChannel)
      } else {
        this.negotiatedDataChannels.set(dataChannel.label, dataChannel)
      }
    }

    const logIceConnectionStateChange = () => {
      console.log('[RTCEngine]', 'ice connection state:', this.pc.iceConnectionState)
    }

    this.listenerManager.add(this.pc, 'negotiationneeded', sendLocalDescription)
    this.listenerManager.add(this.pc, 'icecandidate', sendIceCandidate)
    this.listenerManager.add(this.pc, 'connectionstatechange', updateConnectionState)
    this.listenerManager.add(this.pc, 'iceconnectionstatechange', logIceConnectionStateChange)
    this.listenerManager.add(this.pc, 'datachannel', saveDataChannels)

    this.signaler.on('description', msg => setDescription(msg.description))
    this.signaler.on('icecandidate', msg => setIceCandidate(msg.candidate))

    // 2. 연결 시작
    // 시그널러 start() 훅 호출
    await this.signaler.start()

    // 시그널러 훅 예약
    observe(this.connection).toBe('connected').then(() => this.signaler.connected())
    observe(this.connection).toBe('disconnected').then(() => this.signaler.disconnected())
    observe(this.connection).toBe('failed').then(() => this.signaler.failed())

    // 먼저 role 설정하기
    if (this.polite.get() === undefined) {
      await this.assignRole()
      console.log('[RTCEngine]', 'polite', this.polite.get())
    }

    // 소켓 만들면 연결 시작
    this.socket('RTCEngine-internal').then(socket => {
      // 연결이 닫히면 여기서 리소스 정리
      socket.dataChannel.addEventListener('close', () => {
        if (this.closed.get()) return
        this.close()
      }, { once: true })
    })

    // 3. 재연결
    // connection이 failed이고, 인터넷에 연결되어 있고, 시그널러가 준비되어 있을 때 ice restart를 시도함
    observe(this.connection).onChange(() => {
      if (this.connection.get() !== 'failed') return

      const reconnect = async () => {
        console.log('[RTCEngine]', '시그널러 ready 대기중')
        await wait(this.signaler.ready).toBe(true)

        // wait하는 중 close()가 호출되었을수도 있음
        if (this.closed.get()) return

        this.restartIce()
        console.log('[RTCEngine]', '재연결 시도하는 중...')
      }

      if (navigator.onLine || !this.options.waitOnlineOnReconnection) {
        reconnect()
      } else {
        console.log('[RTCEngine]', '오프라인 상태, 인터넷 연결 대기 중')
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
   * @param {string|undefined} [label] 소켓을 식별하기 위한 식별자. __중복이 불가능합니다.__ 비워두면 unnegotiated socket을 생성합니다.
   * @returns {Promise<RTCSocket>} RTCSocket이 만들어지면 그걸 resolve하는 promise
   */
  async socket (label = undefined) {
    // 레이블이 있으면 negotiated socket 생성
    if (typeof label === 'string') {
      return this.createNegotiatedSocket(label)
    }

    // label이 없으면 unnegotiated socket 생성
    return this.createUnnegotiatedSocket()
  }

  /**
   * 레이블 없이 동적으로 소켓을 생성합니다.
   * @private
   * @param {string|undefined} [labelOverride] 데이터 채널의 레이블. 식별자로 사용되지 않고 중복이 가능합니다. 이 파라미터가 `undefined`면 데이터 채널의 레이블은 기본값으로 설정됩니다.
   * @returns {Promise<RTCSocket>}
   */
  async createUnnegotiatedSocket (labelOverride = undefined) {
    const label = labelOverride || `${UNNEGOTIATED_SOCKET_PREFIX}_${this.unnegotiatedSocketCount++}`
    const dataChannel = this.pc.createDataChannel(label)
    const socket = new RTCSocket(dataChannel)
    await once(socket, '__received')
    return socket
  }

  /**
   * 상대가 레이블 없이 생성한 소켓(unnegotiated socket)을 받아서 내보내는 async generator
   * @yields {Promise<RTCSocket>}
   */
  async * sockets () {
    for await (const dataChannel of this.unnegotiatedDataChannels.pushes()) {
      const socket = new RTCSocket(dataChannel, { received: true })
      yield socket
    }
  }

  /**
   * 레이블로 식별되는 소켓을 생성합니다.
   * @private
   * @param {string} label 소켓을 식별하기 위한 식별자
   * @returns {Promise<RTCSocket>}
   */
  async createNegotiatedSocket (label) {
    await wait(this.polite).toBeDefined()

    // polite가 채널을 만드는 이유는 없음. 그냥 정한거.
    if (this.polite.get()) {
      const dataChannel = this.pc.createDataChannel(label)
      const socket = new RTCSocket(dataChannel)
      await once(socket, '__received')
      return socket
    } else {
      let dataChannel
      if (this.negotiatedDataChannels.has(label)) {
        dataChannel = this.negotiatedDataChannels.get(label)
      } else {
        // start() 안에서 pc의 'datachannel' 이벤트 발생시 this.dataChannels에 레이블을 키로 RTCDataChannel을 넣어줌
        // 그러면 아래 promise가 resolve됨
        dataChannel = await this.negotiatedDataChannels.wait(label).toBeDefined()
      }

      return new RTCSocket(dataChannel, { received: true })
    }
  }

  /**
   * 데이터를 받기 위한 트렌젝션을 만듭니다. 양쪽 피어 모두 동일한 식별자로 이 메소드를 호출하면 트렌젝션이 만들어집니다.
   * @param {string} label 트렌젝션을 식별하기 위한 식별자. __중복이 불가능합니다.__ (RTCDataChannel과는 다릅니다)
   * @returns {Promise<ReadableTransaction>} 트렌젝션이 만들어지면 그걸 resolve하는 promise
   */
  async readable (label) {
    const socket = await this.socket(label)
    const metadata = await once(socket, 'metadata')
    const transaction = new ReadableTransaction(socket, metadata)
    socket.writeEvent('__transaction-ready')
    return transaction
  }

  /**
   * 데이터를 보내기 위한 트렌젝션을 만듭니다. 양쪽 피어 모두 동일한 식별자로 이 메소드를 호출하면 트렌젝션이 만들어집니다.
   * @param {string|undefined} [label] 트렌젝션을 식별하기 위한 식별자. __중복이 불가능합니다.__ 비워두면 unnegotiated transaction을 생성합니다
   * @param {object} [metadata] 트렌젝션의 메타데이터. 아무 정보나 넣을 수 있습니다.
   * @returns {Promise<WritableTransaction>} 트렌젝션이 만들어지면 그걸 resolve하는 promise
   */
  async writable (label = undefined, metadata) {
    /**
     * @type {RTCSocket}
     */
    let socket

    if (typeof label === 'string') {
      socket = await this.socket(label)
    } else {
      const labelOverride = `${UNNEGOTIATED_TRANSACTION_PREFIX}_${this.unnegotiatedTransactionCount++}`
      socket = await this.createUnnegotiatedSocket(labelOverride)
    }

    await Promise.all([
      once(socket, '__transaction-ready'),
      socket.writeEvent('metadata', metadata)
    ])
    return new WritableTransaction(socket, metadata)
  }

  async * readables () {
    for await (const dataChannel of this.unnegotiatedTransactions.pushes()) {
      const socket = new RTCSocket(dataChannel, { received: true })
      const metadata = await once(socket, 'metadata')
      const transaction = new ReadableTransaction(socket, metadata)
      socket.writeEvent('__transaction-ready')
      yield transaction
    }
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
    console.log('[RTCEngine]', 'ICE 재시작됨')
  }

  /**
   * 연결을 닫습니다. 두 피어 사이에 형성된 모든 연결(트렌젝션, 채널 등)이 닫힙니다.
   * 이 메소드를 호출한 후 엔진은 garbage collect될 수 있게 됩니다.
   */
  close () {
    this.pc.close()
    this.pc = null
    this.listenerManager.clear()
    this.negotiatedDataChannels.clear()
    this.closed.set(true)
    this.connection.set('closed')
    console.log('[RTCEngine]', '연결 닫힘')

    this.signaler.close()
  }

  /**
   * 시그널러에서 심각한 오류가 발생해 연결을 계속 진행할 수 없는 경우 연결을 강제로 닫습니다.
   * @param {string} errorStr 오류 메시지.
   */
  abort (errorStr) {
    console.log('[RTCEngine]', '오류가 발생해 연결을 닫음.')
    this.close()

    const error = new Error(errorStr)
    if (this.all.has('error')) {
      this.emit('error', error)
    } else {
      throw error
    }
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
