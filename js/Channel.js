import Mitt from './util/Mitt.js'

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[Channel]', ...args)
}

/**
 * 양방향 데이터 전송을 위한 인터페이스. RTCSocket을 이용해 데이터를 전송합니다.
 */
export default class Channel extends Mitt {
  /**
   * 주의: 이 생성자는 RTCEngine 내부에서만 호출되어야 합니다.
   * @param {RTCSocket} socket 데이터 전송에 사용할 RTCSocket
   * @param {RTCEngine} engine 이 채널을 생성한 엔진
   */
  constructor (socket, engine) {
    super()

    this.engine = engine
    this.socket = socket
    this.socket.on('data', data => this.emit('message', data))
    this.label = this.socket.dataChannel.label
    this.filesSent = 0

    debug(this.label, '생성됨')

    this.socket.on('__file-transaction', label => this.receiveTransaction(label))
  }

  /**
   * 상대가 파일을 보내기 위해 트렌젝션을 만들었을때 파일을 받기 위한 트렌젝션을 생성하고 `transaction` 이벤트로 알립니다.
   * @param {string} label 트렌젝션의 식별자
   */
  async receiveTransaction (label) {
    const transaction = await this.engine.readable(label)
    this.emit('transaction', transaction)
  }

  /**
   * 채널을 통해서 데이터를 전송합니다. `File` 데이터를 받으면 새로운 트렌젝션을 만들고 그걸 통해 파일의 데이터를 전송합니다.
   * 받는쪽에서는 `transaction` 이벤트를 통해 파일을 받을 수 있습니다.
   * @param {*} data 전송할 데이터. `JSON.stringify()`로 JSON 문자열로 바꿀 수 있거나 `ArrayBuffer`의 타입은 그냥 전송하고, `File`인 경우 새로운 트렌젝션을 만듭니다.
   * @returns {Promise<Transaction|void>} 파일 전송을 위한 트렌젝션 또는 데이터가 성공적으로 전송되면 resolve하는 promise
   */
  async send (data) {
    if (data instanceof File) {
      const file = data
      const label = `file - ${this.filesSent++}`
      this.socket.writeEvent('__file-transaction', label)

      const transaction = await this.engine.writable(label, {
        name: file.name,
        size: file.size
      })

      file.stream().pipeTo(transaction.stream)
      return transaction
    }

    return this.socket.write(data)
  }
}
