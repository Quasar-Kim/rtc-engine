import Mitt from '../util/Mitt.js'
import RPCClient from './RPCClient.js'
import once from '../util/once.js'
import ObservableMap from '../util/ObservableMap.js'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[SocketSignaler]', ...args)
}

export default class SocketSignaler extends Mitt {
  constructor (serverURL) {
    super()

    const restoredSessionID = sessionStorage.getItem('sessionID')
    if (restoredSessionID) {
      debug('저장되어 있는 세션 ID 사용', restoredSessionID)
    }

    this.state = new ObservableMap()
    this.state.set('turn', undefined)

    this.rpcClient = new RPCClient(serverURL, { sessionID: sessionStorage.getItem('sessionID') })

    // 세션 ID 업데이트시 sessionStorage도 따라서 업데이트
    this.rpcClient.on('session', sessionID => {
      if (sessionID !== sessionStorage.getItem('sessionID')) {
        debug('세션 ID 새로 발급됨', sessionID)
        this.rpcClient.socket.auth = { sessionID }
      }

      sessionStorage.setItem('sessionID', sessionID)
    })

    // TURN 서버 설정 업데이트
    this.rpcClient.on('turn', turnConfig => {
      this.state.set('turn', turnConfig)
    })

    // 새로 서버와 연결시 새로운 TURN 서버 설정을 받기 위해
    // TURN 서버 설정 초기화
    this.rpcClient.on('connect', () => {
      this.state.set('turn', undefined)
    })

    this.remoteSessionID = undefined

    // 메시지 오면 이벤트
    this.rpcClient.on('relay', e => this.emit('message', e))
  }

  async createSessionCode () {
    const sessionCode = await this.rpcClient.createSessionCode()
    debug('세션 코드 발급됨', sessionCode)
    return sessionCode
  }

  async connect (sessionCode) {
    this.remoteSessionID = await this.rpcClient.retrieveSessionID({ sessionCode })
    debug('세션 ID 찾음', this.remoteSessionID)
    return this.remoteSessionID
  }

  async waitForConnection () {
    if (this.remoteSessionID) return
    this.remoteSessionID = await once(this.rpcClient, 'session id taken')
    debug('세션 ID 접근', this.remoteSessionID)
  }

  // ICE Restart 상황 시 상대가 socket.io 연결이 끊어진 경우 invalid session id 에러가 뜰 수 있음
  // 따라서 상대가 재연결될때까지 기다린 후 ICE restart를 시작해야 함
  async waitForSessionReconnection () {
    this.rpcClient.waitForSessionReconnection({ sessionID: this.remoteSessionID })
    await once(this.rpcClient, 'session reconnection')
  }

  // RPC 에러가 발생할 경우 rejected promise가 발생하는데
  // async 키워드를 사용해야지 에러가 send()를 호출한 컨텍스트까지 에러가 제대로 올라감
  async send (msg) {
    await this.rpcClient.relay({ msg, sessionID: this.remoteSessionID })
    debug('릴레이 메시지 전송됨', msg)
  }

  // async * messages () {
  //   while (true) {
  //     yield await once(this.rpcClient, 'relay')
  //   }
  // }

  get ready () {
    return new Promise(resolve => {
      if (this.rpcClient.socket.connected) {
        resolve()
        return
      }

      once(this.rpcClient.socket, 'connect').then(resolve)
    })
  }

  close () {
    debug('연결 해제 요청')
    this.rpcClient.close()
    this.remoteSessionID = undefined
  }
}
