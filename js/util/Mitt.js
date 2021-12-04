import ObservableClass from 'observable-class'

/**
 * This is a slightly modified version of Mitt package by developit.
 * Mitt: Tiny (~200b) functional event emitter / pubsub.
 */

export default class Mitt extends ObservableClass {
  constructor (all) {
    super()
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
      off()
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
}
