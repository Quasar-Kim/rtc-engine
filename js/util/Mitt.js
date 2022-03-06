/**
 * developit의 Mitt 패키지에서 가져온 Mitt 클래스입니다.
 * Mitt: https://github.com/developit/Mitt
 */

/*
MIT License

Copyright (c) 2021 Jason Miller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export default class Mitt {
  constructor (all) {
    this.all = all || new Map()
  }

  /**
    * Register an event handler for the given type.
    * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
    * @param {Function} handler Function to call in response to given event
    */
  on (type, handler) {
    const handlers = this.all.get(type)
    if (handlers) {
      handlers.push(handler)
    } else {
      this.all.set(type, [handler])
    }
    return handler
  }

  /**
     * Remove an event handler for the given type.
     * If `handler` is omitted, all handlers of the given type are removed.
     * @param {string|symbol} type Type of event to unregister `handler` from, or `'*'`
     * @param {Function} [handler] Handler function to remove
     */
  off (type, handler) {
    const handlers = this.all.get(type)
    if (handlers) {
      if (handler) {
        handlers.splice(handlers.indexOf(handler) >>> 0, 1)
      } else {
        this.all.set(type, [])
      }
    }
  }

  once (type, handler) {
    this.on(type, (evt, off) => {
      // off()
      handler(evt, off)
    })
  }

  /**
     * Invoke all handlers for the given type.
     * If present, `'*'` handlers are invoked after type-matched handlers.
     *
     * Note: Manually firing '*' handlers is not supported.
     *
     * @param {string|symbol} type The event type to invoke
     * @param {Any} [evt] Any value (object is recommended and powerful), passed to each handler
     */
  emit (type, evt) {
    let handlers = this.all.get(type)
    if (handlers) {
      handlers
        .slice()
        .map((handler) => {
          const off = () => this.off(type, handler)
          handler(evt, off)
        })
    }
    handlers = this.all.get('*')
    if (handlers) {
      handlers
        .slice()
        .map((handler) => {
          const off = () => this.off(type, handler)
          handler(type, evt, off)
        })
    }
  }

  /**
   * `on()` 메소드의 alias
   * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
   * @param {Function} handler Function to call in response to given event
   */
  addEventListener (type, handler) {
    return this.on(type, handler)
  }

  /**
   * `off()` 메소드의 alias
   * @param {string|symbol} type Type of event to unregister `handler` from, or `'*'`
   * @param {Function} [handler] Handler function to remove
   */
  removeEventListener (type, handler) {
    return this.off(type, handler)
  }
}
