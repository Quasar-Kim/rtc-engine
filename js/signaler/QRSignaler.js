import SignalerBase from './Base.js'
import * as Comlink from 'comlink'
// import QRCode from 'qrcode'
import * as QRCode from './QRCode.js'
import { JSONRPCServerAndClient, JSONRPCServer, JSONRPCClient } from 'json-rpc-2.0'
import Queue from '../util/Queue.js'
import Mitt from '../util/Mitt.js'
import once from '../util/once.js'

// test only
import { deflate, inflate } from 'https://jspm.dev/pako'
import { fromByteArray as encodeBase64 } from 'https://jspm.dev/base64-js'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[QRSignaler]', ...args)
}

class QRReader extends Mitt {
  constructor (videoElem, role) {
    super()
    this.worker = Comlink.wrap(
      new Worker(new URL('./QRSignaler-worker.js', import.meta.url), { type: 'module' })
    )
    this.lastReadID = -1
    this.videoElem = videoElem
    this.ctx = document.createElement('canvas').getContext('2d')
    this.role = role
    this.start()
  }

  async start () {
    await this.worker.init()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        focusMode: 'continuous'
      }
    })

    this.videoElem.srcObject = stream
    this.videoElem.play()

    this.videoElem.addEventListener('loadedmetadata', () => {
      this.ctx.canvas.width = this.videoElem.videoWidth
      this.ctx.canvas.height = this.videoElem.videoHeight
      requestAnimationFrame(() => this.detect())
    }, { once: true })
  }

  async detect () {
    try {
      this.ctx.drawImage(this.videoElem, 0, 0)
      const imageData = this.ctx.getImageData(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
      const msgs = await this.worker.detectQR(Comlink.transfer(imageData))

      for (const msg of msgs) {
        const parsed = JSON.parse(msg)

        // 동일한 메시지가 여러번 읽어지는거 방지
        if (parsed.id <= this.lastReadID) continue
        if (parsed.from === this.role) continue
        if (this.lastReadID === -1 && parsed?.method === 'getControl') continue

        this.lastReadID = parsed.id
        this.emit('read', parsed)
      }
    } finally {
      requestAnimationFrame(() => this.detect())
    }
  }
}

// 두 피어는 rpc 클라이언트인 controller와 rpc 서버인 controlled의 역할을 나눠가짐
// controller는 rpc 메소드 next()를 호출해 controlled의 메시지를 가져옴
// next() rpc 메소드는 msgQueue에 보낼 게 있으면 그걸 리턴하고 없으면 null을 리턴함
// 그리고 null이 리턴된 이후 한번 더 호출되면 HTTP long polling같이 새 메시지가 들어올때까지 대기했다가 리턴함
// controller는 이 사이에 자신이 보내고 싶은 메시지가 있는 경우 giveControl() rpc 메소드를 호출하고 next의 리턴값은 무시할 수 있음

// controller가 보낼 메시지가 있는 경우 rpc 메소드 giveControl로 상대에게 컨트롤을 넘기고 아래와 같은 작업 수행
// controlled가 보낼 메시지가 있는 경우 QR 코드로 rpc response 전송
export default class QRSignaler extends SignalerBase {
  constructor ({ role, videoElem, canvasElem }) {
    super()
    this.role = role // controller | controlled
    this.canvas = canvasElem
    this.nullReceived = false
    this.nullSent = false

    // RTCEngine이 사용할 옵션
    this.options = {
      iceServers: [], // turn, stun 비활성화 - 이 시그널러는 오프라인 사용이 전제
      role: this.role === 'controller' ? 'impolite' : 'polite' // controller가 impolite인 이유는 없음(임의로 정한것)
    }

    // rpc 관련
    this.msgQueue = new Queue()
    this.rpcSocket = new JSONRPCServerAndClient(
      new JSONRPCServer(),
      new JSONRPCClient(async payload => {
        if (payload?.result === 'DO_NOT_RESPONSE') return

        debug('sending', payload)
        await this.writeQR({ from: this.role, ...payload })
      })
    )
    this.rpcSocket.addMethod('next', async () => {
      if (this.msgQueue.size > 0) {
        return this.msgQueue.pop()
      } else if (!this.nullSent) {
        this.nullSent = true
        return null
      } else {
        await once(this.msgQueue, 'push')
        this.nullSent = false

        // promise를 기다리는 동안 role이 바뀌었을수도 있고 이 경우 response를 전송하지 않음
        if (this.role !== 'controlled') return 'DO_NOT_RESPONSE'
        return this.msgQueue.pop()
      }
    })
    this.rpcSocket.addMethod('getControl', () => {
      this.nullReceived = false
      this.nullSent = false
      this.role = 'controller'
      this.reader.lastReadID = -1
      this.reader.role = 'controller'
      debug('lastReadID reset to -1')
      this.emit('gotControl')
      debug('got control')
      this.startPull()
      return 'DO_NOT_RESPONSE'
    })

    // QR reader 관련
    this.reader = new QRReader(videoElem, this.role)
    this.reader.on('read', payload => {
      this.rpcSocket.receiveAndSend(payload)
    })

    if (this.role === 'controller') {
      this.startPull()
    }
  }

  async startPull () {
    if (this.role !== 'controller') throw new Error('startReceiving() 메소드는 controller만 호출 가능합니다')

    do {
      const msgPromise = this.rpcSocket.request('next')
      if (this.nullReceived) {
        if (this.msgQueue.size === 0) {
          debug('waiting...')
          await Promise.any([
            msgPromise,
            once(this.msgQueue, 'push')
          ])
        }

        // 내가 보낼 메시지가 생긴 경우
        if (this.msgQueue.size > 0) {
          debug('transferring control')
          this.giveControl()
          return
        } else {
          // 아니면 메시지 받기 계속함
          debug('continuing receiving message')
          this.nullReceived = false
        }
      }

      const msg = await msgPromise

      // 상대가 더이상 보낼 메시지가 없는 경우
      // 한번더 next 호출하면 long polling같이 새 메시지가 들어온 뒤에 그 값이 리턴됨
      // 이사이에 controller는 giveControl을 호출할수도 있고, 이 경우 위에서 호출한 next의 response는 발생하지 않음
      if (msg === null) {
        this.nullReceived = true
        debug('null received')
      } else {
        this.emit('message', msg)
      }
    } while (this.role === 'controller')
  }

  giveControl () {
    if (this.role !== 'controller') throw new Error('giveControl() 메소드는 controller만 호출 가능합니다')
    this.rpcSocket.request('getControl')
    this.nullReceived = false
    this.nullSent = false
    this.role = 'controlled'
    this.reader.role = 'controlled'
    this.reader.lastReadID = -1
  }

  async writeQR (payload) {
    const serialized = JSON.stringify(payload)
    debug('length:', serialized.length)
    debug('compressed', encodeBase64(deflate(serialized)).length)
    await QRCode.toCanvas(this.canvas, serialized)
  }

  send (data) {
    debug('enqueued', data)
    this.msgQueue.push(data)
  }

  get ready () {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      if (this.role === 'controlled') {
        await once(this, 'gotControl')
      }

      resolve()
    })
  }
}
