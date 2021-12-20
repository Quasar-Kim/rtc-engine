import Mitt from './Mitt.js'
import { ObservableEntry, WaitEntry } from './ObservableEntry.js'

export function wait (observableEntry) {
  return new WaitEntry({ observableEntry })
}

// TODO: observe에도 condition 쓸 수 있도록 - observe(prop).toBe('connected')같이
export function observe (observableEntry) {
  return {
    onChange (callback) {
      let canceled = false
      const waitEntry = new WaitEntry({ observableEntry, once: false })

      const cancel = () => {
        canceled = true
      }

      const callCallback = newVal => {
        callback(newVal, cancel)

        if (canceled) {
          waitEntry.cancel()
        }
      }

      waitEntry.toBeChanged().then(callCallback)
    }
  }
}

export function waitAll (waitEntriesFn) {
  let resolveFn
  const promise = new Promise(resolve => {
    resolveFn = resolve
  })

  // 각 waitEntry 별 resolve 여부 나타냄
  /**
   * @type {Map<WaitEntry, boolean>}
   */
  const waitEntries = new Set()
  let fulfilledWaitEntries = 0

  // waitEntry 받고...
  waitEntriesFn(observableEntry => {
    let resolved = false
    const waitEntry = new WaitEntry({
      observableEntry,
      once: false,
      unmatchedCallback: () => {
        if (!resolved) return

        resolved = false
        fulfilledWaitEntries--
      }
    })

    // 맞으면 fulfilledWaitEntry 추가
    waitEntry.then(() => {
      if (resolved) return

      resolved = true
      fulfilledWaitEntries++
      if (fulfilledWaitEntries === waitEntries.size) {
        // 정리
        for (const entry of waitEntries.values()) {
          entry.cancel()
        }
        resolveFn()
      }
    })

    waitEntries.add(waitEntry)
    return waitEntry
  })

  return promise
}

export default class ObservableClass extends Mitt {
  constructor () {
    super()
    this.setObservableProps()
  }

  setObservableProps () {
    // this.constructor refers to child class
    for (const prop of this.constructor.observableProps) {
      const observableProp = new ObservableEntry()

      Object.defineProperty(this, prop, {
        get: () => observableProp,
        set: val => observableProp.set(val)
      })
    }
  }
}
