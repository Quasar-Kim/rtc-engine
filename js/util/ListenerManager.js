/**
 * @typedef EventListenerEntry
 * @type {{
 *   evt: string,
 *   listener: EventListener
 * }}
 */

/**
 * DOM 객체에 추가된 이벤트 리스너들을 한번에 정리할 수 있도록 도와주는 매니저.
 */
export default class ListenerManager {
  constructor () {
    /** @type {Map<EventTarget, EventListenerEntry>} */
    this.listeners = []
  }

  /**
   * 이벤트 리스너를 추가합니다.
   * @param {EventTarget} target 이벤트 리스너를 추가할 대상
   * @param {string} evt 이벤트 이름
   * @param {EventListener} listener 이벤트 리스너
   * @param  {...any} args `addEventListener`에 전달할 추가 인수들
   */
  add (target, evt, listener, ...args) {
    target.addEventListener(evt, listener, ...args)

    const entry = {
      evt,
      listener
    }
    this.listeners.push([target, entry])
  }

  /**
   * 모든 이벤트 리스너들을 정리합니다.
   */
  clear () {
    for (const [target, entry] of this.listeners) {
      target.removeEventListener(entry.evt, entry.listener)
    }
    this.listeners.length = 0
  }
}
