import { JSONRPCClient } from 'json-rpc-2.0'
import Mitt from '../js/util/Mitt.js'
import io from 'socket.io-client'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[RPCClient]', ...args)
}

export default class RPCClient extends Mitt {
  constructor (sendFnOrServerURL, auth = {}) {
    super()

    const sendRPCUsingSocket = async (request, jsonRPCClient) => {
      this.socket.emit('rpc', request, response => {
        jsonRPCClient.receive(response)
      })
    }

    // 첫 파라미터로 서버 URL이 주어졌다면 해당 서버와의 socket.io 연결을 이용해 RPC 구현
    // 그렇지 않으면 주어진 함수가 알아서 할것임
    let sendFn = sendFnOrServerURL
    if (typeof sendFnOrServerURL === 'string') {
      this.socket = io(sendFnOrServerURL, { autoConnect: false })
      this.socket.auth = auth
      this.socket.connect()
      // mitt는 event payload 하나만 받을 수 있음
      this.socket.onAny((eventName, arg) => this.emit(eventName, arg))
      sendFn = sendRPCUsingSocket
    }

    this.jsonRPCClient = new JSONRPCClient(sendFn)
    this.PUBLIC_METHODS = new Set(['close', 'on', 'off', 'socket', 'once'])

    return new Proxy(this, {
      get: (target, prop) => {
        if (target.PUBLIC_METHODS.has(prop)) {
          // 가져올 속성이 함수인 경우 this 문제 발생
          // 자바스크립트에서 this는 receiver(점 앞에 있는 객체)로 설정되므로
          // Reflect.get으로 가져온 함수가 실행되면 this가 프록시 인스턴스로 설정됨
          // 따라서 bind 이용
          // 참조 - https://javascript.info/proxy
          let val = Reflect.get(target, prop, this)
          if (typeof val === 'function') {
            val = val.bind(target)
          }
          return val
        }

        // <함수 이름>을 get할시 해당 함수에 대한 RPC 요청을 생성하는 함수를 만들어 리턴
        const methodName = prop
        return async arg => {
          debug('RPC 요청', { methodName, arg })
          return await this.jsonRPCClient.request(methodName, arg, target.jsonRPCClient)
        }
      }
    })
  }

  close () {
    return this.socket?.close()
  }
}
