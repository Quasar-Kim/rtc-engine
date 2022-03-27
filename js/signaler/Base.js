import Mitt from '../util/Mitt.js'
import { ObservableEntry } from '../util/ObservableEntry.js'

// /**
//  * @template T
//  * @typedef {import('../util/Mitt.js').EventHandler<T>} EventHandler<T>
//  */

// /**
//  * @typedef {import('../RTCEngine.js').default} RTCEngine
//  */

/**
 * 시그널러에 필수적인 기능들을 제공하는 베이스 클래스. 시그널러는 반드시 이 클래스를 확장해야 합니다.
 *
 * 다음과 같은 기능들을 제공합니다:
 *  - 받은 메시지의 `type` 에 해당하는 이벤트를 발생시켜서 메시지를 전달합니다.
 *    이렇게 하면 하나의 이벤트를 발생시키는것보다 효율적으로 코드를 구현할 수 있습니다.
 *  - `type` 이벤트의 핸들러가 없을 경우 핸들러가 추가될때까지 기다렸다가 추가되면 그 핸들러가 전에 받았던 메시지를 모두 처리하도록 합니다.
 *    이렇게 하면 시그널러가 엔진이 생성되기전에 메시지를 받아도 메시지가 정상적으로 엔진에 전달됩니다.
 */
export default class SignalerBase extends Mitt {
  constructor () {
    super()

    /**
     * 시그널러가 메시지를 보낼 수 있는 상태인지 나타내는 값.
     * RTCEngine은 시그널러와 상호작용할 때 항상 이 값이 `true`가 될때까지 기다립니다.
     */
    this.ready = new ObservableEntry(false)

    /**
     * RTCEngine 생성시 적용될 설정값들.
     * 유저 설정값에 의해서 덮어써질 수 있습니다.
     */
    this.options = {}

    /**
     * 받은 메시지의 `type` 필드에 해당하는 이벤트 리스너가 없으면 여기에 보관됩니다.
     * @type {Map<string, any[]>}
     */
    this.unhandledMsg = new Map()
  }

  /**
   * 메시지를 엔진에 전달합니다.
   * @param {*} msg 받은 메시지
   */
  receive (msg) {
    if (!('type' in msg)) {
      throw new Error('Received message does not include \'type\' field')
    }

    if (this.all.has(msg.type)) {
      this.emit(msg.type, msg)
    } else {
      // 핸들러가 없다면 unhandledMsg에 보관
      if (!this.unhandledMsg.has(msg.type)) {
        this.unhandledMsg.set(msg.type, [])
      }

      const queuedMsgs = this.unhandledMsg.get(msg.type)
      queuedMsgs.push(msg)
    }
  }

  /**
   * 특정 `type`의 메시지에 대한 핸들러를 등록합니다.
   * @param {string} type 받을 메시지의 타입
   * @param {EventHandler<object>} handler 메시지의 핸들러
   */
  on (type, handler) {
    super.on(type, handler)

    if (!this.unhandledMsg.has(type)) return

    for (const msg of this.unhandledMsg.get(type)) {
      this.emit(type, msg)
    }
    this.unhandledMsg.delete(type)
  }

  /**
   * @abstract
   * @param {*} data 전송할 데이터
   */
  send (data) {}

  /**
   * @abstract
   * @param {RTCEngine} engine 엔진 인스턴스
   */
  start (engine) {}

  /**
   * @abstract
   * @param {RTCEngine} engine 엔진 인스턴스
   */
  connected (engine) {}

  /**
   * @abstract
   * @param {RTCEngine} engine 엔진 인스턴스
   */
  disconnected (engine) {}

  /**
   * @abstract
   * @param {RTCEngine} engine 엔진 인스턴스
   */
  failed (engine) {}

  /**
   * @abstract
   * @param {RTCEngine} engine 엔진 인스턴스
   */
  close (engine) {}
}
