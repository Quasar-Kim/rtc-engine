import SignalerBase from './Base.js'
import * as Comlink from 'comlink'
import QRCode from 'qrcode'
// import * as QRCode from './QRCode.js'
import { JSONRPCServerAndClient, JSONRPCServer, JSONRPCClient } from 'json-rpc-2.0'
import Queue from '../util/Queue.js'
import once from '../util/once.js'

// TODO: controller와 controlled의 개념 삭제, 모두 long polling으로 구현
// TODO: autoStart 기능 구현 - 지금은 start() 호출하지 않을시 config가 RTCEngine에 반영되지 않는 오류가 있음

const MAX_LENGTH = 200

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[QRSignaler]', ...args)
}

/**
 * QR코드에 담긴 메시지를 사용자의 카메라로부터 읽어오고 `read` 이벤트로 알리는 클래스
 */
class QRReader extends SignalerBase {
  constructor (videoElem, role) {
    super()
    this.worker = Comlink.wrap(
      new Worker(new URL('./QRSignaler-worker.js', import.meta.url), { type: 'module' })
    )
    this.lastReadID = -1
    this.videoElem = videoElem
    this.ctx = document.createElement('canvas').getContext('2d')
    this.role = role
    this.animationFrameHandle = -1
    this.start()
  }

  /**
   * QR코드 읽기를 시작합니다.
   */
  async start () {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user'
      }
    })

    this.videoElem.srcObject = stream
    this.videoElem.play()

    this.videoElem.addEventListener('loadedmetadata', () => {
      this.ctx.canvas.width = this.videoElem.videoWidth
      this.ctx.canvas.height = this.videoElem.videoHeight
      this.animationFrameHandle = requestAnimationFrame(() => this.detect())
    }, { once: true })
  }

  /**
   * 카메라에서 읽어들인 프레임으로부터 QR코드를 읽고 새로운 메시지이면 `read` 이벤트로 알립니다.
   * @private
   */
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
      this.animationFrameHandle = requestAnimationFrame(() => this.detect())
    }
  }

  /**
   * QR코드 읽기를 중단합니다.
   */
  stop () {
    cancelAnimationFrame(this.animationFrameHandle)
    const track = this.videoElem.srcObject.getTracks()[0]
    track.stop()
  }
}

/**
 * QR코드를 이용한 양방향 통신으로 메시지를 전송하는 시그널러. 오프라인 사용을 전제로 만들어졌습니다.
 * 두 기기가 모두 카메라를 가지고 있어야 합니다.
 */
export default class QRSignaler extends SignalerBase {
  /**
   * @param {object} options
   * @param {HTMLVideoElement} options.videoElem 카메라에 보여지는 프레임들을 표시할 비디오 element
   * @param {HTMLCanvasElement} options.canvasElem QR코드를 그릴 캔버스 element
   * @param {'controller' | 'controlled'} options.role 피어의 역할에 대한 초깃값. 두 피어의 역할은 반드시 달라야 합니다.
   * controller는 rpc client로, controlled는 rpc server로 작동합니다.
   * controller는 rpc 메소드 `next()`로 controlled의 큐에 있는 메시지를 가져옵니다. 메시지가 더이상 없으면 controlled는 `QUEUE_EMPTY` 메시지를 보냅니다.
   * 이 메시지를 받은 controller는 `next()`를 한번 더 호출하고 보내거나 받을 메시지가 추가로 생길때가지 대기합니다. controller가 보낼 메시지가 생기면 서로의 role을 바꾼뒤 메시지를 보내고,
   * controlled가 생기면 controlled는 위에서 한번 더 호출한 `next()`의 결과를 리턴합니다.(HTTP Long polling과 비슷합니다.)
   */
  constructor (options) {
    super()
    this.role = options.role // controller | controlled
    this.videoElem = options.videoElem
    this.canvas = options.canvasElem
    this.msgQueue = new Queue()
    this.active = false

    this.start()
  }

  /**
   * 시그널러를 시작합니다.
   * QR코드 읽기를 시작하고, role이 controller인경우 pulling을 시작합니다.
   */
  start () {
    this.active = true
    this.emit('active')
    this.nullReceived = false
    this.nullSent = false

    // multipart 메시지 관련
    this.multipartID = 0
    // key: multipartID, value: chunk들의 배열
    this.parts = new Map()

    // RTCEngine이 사용할 옵션
    this.options = {
      iceServers: [], // turn, stun 비활성화 - 이 시그널러는 오프라인 사용이 전제
      role: this.role === 'controller' ? 'impolite' : 'polite', // controller가 impolite인 이유는 없음(임의로 정한것)
      waitOnlineOnReconnection: false // 오프라인일때도 자동 재연결이 작동하도록
    }

    // rpc 관련
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
        return 'QUEUE_EMPTY'
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
      debug('got control')
      this.startPull()
      return 'DO_NOT_RESPONSE'
    })

    // QR reader 관련
    this.reader = new QRReader(this.videoElem, this.role)
    this.reader.on('read', payload => {
      this.rpcSocket.receiveAndSend(payload)
    })

    if (this.role === 'controller') {
      this.startPull()
    }
  }

  /**
   * next()` rpc 메소드를 controlled의 큐가 빌때까지 실행하고, 큐가 비면 대기하거나 역할을 바꿉니다.(`constructor`의 `options.role` 파라미터의 설명 참조)
   * @private
   */
  async startPull () {
    if (this.role !== 'controller') throw new Error('startPull() 메소드는 controller만 호출 가능합니다')

    do {
      const msgPromise = this.rpcSocket.request('next')
      if (this.nullReceived) {
        if (this.msgQueue.size === 0) {
          debug('waiting...')
          this.emit('waiting')
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
      if (msg === 'QUEUE_EMPTY') {
        this.nullReceived = true
        debug('null received')
      } else if (msg.multipartID !== undefined) {
        // 멀티파트 메시지인경우
        // 메시지 예시:
        // { multipartID: 0, c: <data>, l:length }
        if (!this.parts.has(msg.multipartID)) {
          this.parts.set(msg.multipartID, [])
        }

        const parts = this.parts.get(msg.multipartID)
        parts.push(msg.c)

        // 마지막 청크면 다 합치고 message 이벤트 발생시키기
        if (msg.l === parts.length) {
          const assembled = parts.reduce((acc, c) => acc + c, '')
          this.receiveMessage(assembled)
        }
      } else {
        this.receiveMessage(msg)
      }
    } while (this.role === 'controller')
  }

  /**
   * QR코드로부터 읽은 메시지를 json으로 파싱하고 `message` 이벤트로 전달합니다.
   * @param {*} msg QR코드로부터 읽은 메시지
   * @private
   */
  receiveMessage (msg) {
    const parsed = JSON.parse(msg)
    this.emit('message', parsed)
  }

  /**
   * 상대를 controller로, 자신을 controlled로 만듭니다.
   * @private
   */
  giveControl () {
    if (this.role !== 'controller') throw new Error('giveControl() 메소드는 controller만 호출 가능합니다')
    this.rpcSocket.request('getControl')
    this.nullReceived = false
    this.nullSent = false
    this.role = 'controlled'
    this.reader.role = 'controlled'
    this.reader.lastReadID = -1
  }

  /**
   * QR코드를 캔버스에 그립니다.
   * @param {*} payload QR코드에 작성할 메시지. 메시지는 `JSON.stringify()`로 변환된 후 QR코드에 작성됩니다.
   * @private
   */
  async writeQR (payload) {
    if (typeof payload !== 'string') {
      await QRCode.toCanvas(this.canvas, JSON.stringify(payload))
    } else {
      await QRCode.toCanvas(this.canvas, payload)
    }
  }

  /**
   * 메시지를 전송합니다.
   * @param {*} data 보낼 메시지
   */
  send (data) {
    debug('enqueued', data)

    // 200자 단위로 분리
    // NOTE: substring의 end는 길이보다 더 길면 end를 length로 설정한것과 같이 작동함
    const serialized = JSON.stringify(data)
    const chunks = []
    let start = 0
    let end = MAX_LENGTH
    while (start < serialized.length) {
      chunks.push(serialized.substring(start, end))
      start += MAX_LENGTH
      end += MAX_LENGTH
    }

    if (chunks.length === 1) {
      this.msgQueue.push(chunks[0])
    } else {
      const multipartID = this.multipartID++
      for (const c of chunks) {
        this.msgQueue.push({ multipartID, c, l: chunks.length })
      }
    }
  }

  get ready () {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      if (!this.active) {
        await once(this, 'active')
      }
      resolve()
    })
  }

  /**
   * 시그널러를 정지합니다.
   */
  stop () {
    this.active = false
    this.reader.stop()
    this.msgQueue.flush()
    this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
