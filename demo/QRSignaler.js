import { SignalerBase } from 'https://jspm.dev/rtc-engine'
import * as Comlink from 'https://jspm.dev/comlink'
// import QRCode from 'https://jspm.dev/qrcode'
import QRCode from 'https://jspm.dev/easyqrcodejs'
import { deflate, inflate } from 'https://jspm.dev/pako'
import { fromByteArray as base64Encode } from 'https://jspm.dev/base64-js'

// video width/height 설정 필수!
// manual role assignment 필요!

// TODO: pako zip, rtc-engine이 ready 속성을 항상 이용하도록

export default class QRSignaler extends SignalerBase {
  constructor ({ videoElem, canvasElem, role }) {
    super()
    this.worker = Comlink.wrap(
      new Worker(new URL('./QRSignaler-worker.js', import.meta.url), {
        type: 'module'
      })
    )
    this.outputVideoElem = videoElem
    this.videoWidth = this.outputVideoElem.width
    this.videoHeight = this.outputVideoElem.height
    this.canvasElem = canvasElem
    this.videoTrack = null

    this._lastMsg = undefined
    this._zbarInitiated = false
    this._animationFrameRequestID = -1
    this._ctx = document.createElement('canvas').getContext('2d')
    this._ctx.canvas.width = this.videoWidth
    this._ctx.canvas.height = this.videoHeight

    this.options = {
      iceServers: [],
      role
    }

    this.msg = {
      candidate: [],
      description: ''
    }
    this.candidateGatheringDone = false
  }

  get ready () {
    // TODO: ice candidate를 만 받도록 local 설정해야 함
    return new Promise((resolve) => {
      if (this._zbarInitiated) {
        return true
      }

      this.once('zbar-initiated', () => resolve())
    })
  }

  async start () {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        aspectRatio: 1.3333333333,
        frameRate: 60,
        facingMode: { exact: 'user' }
      }
    })
    this.outputVideoElem.srcObject = stream
    this.outputVideoElem.play()
    this.videoTrack = stream.getVideoTracks()[0]

    if (!this._zbarInitiated) {
      console.log('loading zbar.wasm')
      await this.worker.init()
      this._zbarInitiated = true
      this.emit('zbar-initiated')
    }

    console.log('load complete')
    this._animationFrameRequestID = requestAnimationFrame(
      this.detect.bind(this)
    )
  }

  _getImageData () {
    this._ctx.drawImage(
      this.outputVideoElem,
      0,
      0,
      this.videoWidth,
      this.videoHeight
    )
    return this._ctx.getImageData(0, 0, this.videoWidth, this.videoHeight)
  }

  // not for direct calling
  async detect () {
    const imageData = this._getImageData()
    const msg = await this.worker.detectQR(Comlink.transfer(imageData))

    if (msg === undefined) return
    if (msg === this._lastMsg) return

    this._lastMsg = msg
    console.log('received qr message', msg)

    try {
      const parsed = JSON.parse(msg)

      if (!parsed.description || !parsed.candidate) {
        throw new Error('invalid message')
      }

      this.emit('message', {
        type: 'description',
        description: parsed.description
      })
      this.emit('message', {
        type: 'icecandidate',
        candidate: parsed.candidate
      })
    } catch (err) {
      console.warn('invalid qr code message')
    }

    this._animationFrameRequestID = requestAnimationFrame(
      this.detect.bind(this)
    )
  }

  async send (msg) {
    console.log(msg)

    // description / host candidate / null candidate만 받음
    if (msg.type === 'icecandidate' && msg.candidate !== null && msg?.candidate.type !== 'host') return

    if (msg.type === 'description') {
      this.msg.description = msg.description
    } else if (msg.type === 'icecandidate') {
      if (msg.candidate === null) {
        this.candidateGatheringDone = true
      } else {
        this.candidateGatheringDone = false
      }
      this.msg.candidate.push(msg.candidate)
    }

    if (this.msg.description && this.candidateGatheringDone) {
      const data = deflate(JSON.stringify(this.msg))
      console.log('message to send', this.msg)
      console.log('compressed size:', data.length)
      // await QRCode.toCanvas(this.canvasElem, [{ data: Uint8ClampedArray.from(data), mode: 'byte' }])
      const qr = new QRCode(document.querySelector('#qrcodeOut'), {
        binary: true,
        correctLevel: QRCode.CorrectLevel.L
      })
      qr.makeCode(data)
    }
  }

  stop () {
    cancelAnimationFrame(this._animationFrameRequestID)
    this.videoTrack.stop()
  }
}
