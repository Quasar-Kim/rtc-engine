import Mitt from './Mitt.js'
import { ObservableEntry, WaitEntry } from './ObservableEntry.js'

export function wait (observableEntry) {
  return new WaitEntry({ observableEntry })
}

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
  let fulfilledWaitEntries = 0
  const waitEntries = new Set()

  // waitEntry 받고...
  waitEntriesFn(observableEntry => {
    const waitEntry = new WaitEntry({ observableEntry, once: false, unmatchedCallback: () => fulfilledWaitEntries-- })

    // 맞으면 fulfilledWaitEntry 추가
    waitEntry.then(() => {
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
