// RTC 연결 형성 및 관리
import ObservableMap from './util/ObservableMap.js'
import ObservableClass, { wait } from 'observable-class'
import RTCSocket from './RTCSocket.js'
import once from './util/once.js'
import Channel from './Channel.js'
import TransactionWriter from './TransactionWriter.js'
import TransactionReader from './TransactionReader.js'

function debug(...args) {
  console.log('[RTCEngine]', ...args)
}

const stun = {
  urls: ['stun:stun.l.google.com:19302']
}

export default class RTCEngine extends ObservableClass {
  makingOffer = false // offer collision 방지를 위해 offer을 만드는 동안이면 기록
  polite = false // perfect negotiation pattern에서 사용하는 role
  ignoreOffer = false // offer collision 방지를 위해 role이나 signalingState등에 기반해 받은 offer을 받을지 결정
  // 데이터 채널 맵 <label, RTCDataChannel>
  dataChannels = new ObservableMap()

  static observableProps = ['connection']

  // 가능한 옵션: turn, autoConnect
  // autoConnect: constructor 호출 시 자동으로 connect도?
  constructor(signaler, options = { turn: [], autoConnect: true }) {
    super()

    const iceServers = [stun]
    if (options.turn?.length > 0) {
      iceServers.push(options.turn)
    }

    this.connection = 'inactive' // 연결의 상태를 나타냄. inactive를 제외하고는 RTCPeerConnection의 connectionState와 동일함. inactive / connecting / connected / disconnected / failed 
    this.pc = new RTCPeerConnection({ iceServers })
    this.signaler = signaler

    if (options.autoConnect) {
      this.connect()
    }
  }

  assignRole() {
    return new Promise(resolve => {
      const seed = Math.random()

      this.signaler.send({
        type: 'role',
        seed
      })

      this.signaler.on('message', msg => {
        if (msg.type !== 'role') return

        const remoteSeed = msg.seed
        if (remoteSeed > seed) {
          this.polite = true
        } else {
          this.polite = false
        }
        resolve()
      })
    })
  }

  async start() {
    // 아래 내부 함수들은 모두 this로 RTCEngine 인스턴스에 접근할 수 있게 하기 위해
    // 모두 화살표 함수임(고치지 마라)
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
        this.signaler.send({
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

    this.pc.addEventListener('negotiationneeded', sendLocalDescription)
    this.pc.addEventListener('icecandidate', sendIceCandidate)
    this.pc.addEventListener('connectionstatechange', updateConnectionState)
    this.pc.addEventListener('iceconnectionstatechange', () => {
      debug('ice connection state', this.pc.iceConnectionState)
    })
    this.pc.addEventListener('datachannel', saveDataChannelsToMap)

    // 데이터 채널 만들면 연결 시작
    if (this.polite) {
      this.pc.createDataChannel('RTCEngine_initiator')
    }

    // 메시지 라우팅
    this.signaler.on('message', msg => {
      if (msg.type === 'description') {
        setDescription(msg.description)
      } else if (msg.type === 'icecandidate') {
        setIceCandidate(msg.candidate)
      }
    })
  }

  // socket.io의 connect()와 비슷하게 연결 시작과 재연결 수동 시작의 기능을 동시에 함
  async connect() {
    if (this.connection.get() === 'failed') {
      this.restartIce()
    } else if (this.connection.get() === 'inactive') {
      await this.assignRole()
      debug('polite', this.polite)
      this.start()
    }

    return wait(this.connection).toBe('connected')
  }

  async socket(label) {
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
  
  async readable(label, options) {
    const socket = await this.socket(label)
    return new TransactionReader(socket, options)
  }

  async writable(label, options) {
    const socket = await this.socket(label)
    return new TransactionWriter(socket, options)
  }

  async channel(label) {
    const socket = await this.socket(label)
    return new Channel(socket)
  }

  restartIce() {
    this.pc.restartIce()
    debug('ICE 재시작됨')
  }

  close() {
    this.pc.close()
    debug('RTC 연결 해제됨')
  }

  async getReport(dataStream) {
    for (const [, report] of await this.pc.getStats()) {
      if (report.type === 'data-channel' && report.dataChannelIdentifier === dataStream.dataChannel.id) {
        return report
      }
    }
  }
}