import Queue from './Queue.js'
import Mitt from './Mitt.js'

export default class ObservableMap {
  constructor (iterable = []) {
    this.data = new Map(iterable)
    // Map<key, Set<function>>
    this.conditionsMap = new Map()
    // Map<function, function>
    this.callbacksMap = new Map()
  }

  get (key) {
    return this.data.get(key)
  }

  set (key, val) {
    const oldVal = this.data.get(key)
    this.data.set(key, val)
    if (oldVal !== val) {
      this.testConditions(key, val)
    }
    return this
  }

  delete (key) {
    return this.data.delete(key)
  }

  has (key) {
    return this.data.has(key)
  }

  wait (key) {
    return new Observer({ key, origin: this, once: true })
  }

  observe (key) {
    return new Observer({ key, origin: this })
  }

  testConditions (key, updatedVal) {
    const conditions = this.conditionsMap.get(key) ?? new Set()
    for (const conditionFn of conditions) {
      const [matchedCallbackFn, notMatchedCallbackFn] = this.callbacksMap.get(
        conditionFn
      )
      if (conditionFn(updatedVal) === true) {
        matchedCallbackFn?.call({}, updatedVal)
      } else {
        notMatchedCallbackFn?.call({}, updatedVal)
      }
    }
  }

  registerCondition (key, conditionFn, matchedCallbackFn, notMatchedCallbackFn) {
    // TODO: set() required?
    let conditions = this.conditionsMap.get(key)
    if (!conditions) {
      conditions = new Set()
      this.conditionsMap.set(key, conditions)
    }
    conditions.add(conditionFn)

    this.callbacksMap.set(conditionFn, [
      matchedCallbackFn,
      notMatchedCallbackFn
    ])
  }

  removeCondition (key, conditionFn) {
    this.conditionsMap.get(key).delete(conditionFn)
    this.callbacksMap.delete(conditionFn)
  }
}

export class Observer extends Mitt {
  constructor ({ key, origin, once = false }) {
    super()
    this.selectedKey = key
    this.keys = [key]
    this.origin = origin
    this.callbackQueue = new Queue()
    this.once = once
    this.resolved = false

    this.conditions = new Map()
    this.conditionsCount = 0
    this.fulfilledConditionsCount = 0
  }

  then (fulfilledCallback) {
    this.callbackQueue.push(fulfilledCallback)
    if (this.resolved) this.resolve()
  }

  retrievedChangedValues () {
    const values = []
    for (const key of this.keys) {
      values.push(this.origin.get(key))
    }
    return values
  }

  resolve () {
    let values = this.retrievedChangedValues()
    if (values.length === 1) {
      values = values[0]
    }

    while (this.callbackQueue.size !== 0) {
      const callbackFn = this.callbackQueue.pop()
      callbackFn(values)
    }

    this.emit('fulfill', values)
  }

  toFulfill (conditionFn) {
    this.origin.registerCondition(
      this.selectedKey,
      conditionFn,
      () => this.updateConditionState(conditionFn, true),
      () => this.updateConditionState(conditionFn, false)
    )
    this.conditions.set(conditionFn, { matched: false, key: this.selectedKey })
    this.conditionsCount++

    // const keyCount = this.keys.length
    // queueMicrotask(() => {
    //   if (this.keys.length !== keyCount) return
    //   if (this.resolved) return

    //   for (const key of this.keys) {
    //     this.origin.testConditions(key, this.origin.get(key))
    //   }
    // })

    return this
  }

  updateConditionState (conditionFn, matched) {
    const { matched: matchedPreviously } = this.conditions.get(conditionFn)
    // if (matched === matchedPreviously) return

    // duplicated get()
    this.conditions.get(conditionFn).matched = matched

    if (matched !== matchedPreviously) {
      if (matched) {
        this.fulfilledConditionsCount++
      } else {
        this.fulfilledConditionsCount--
      }
    }

    if (this.fulfilledConditionsCount === this.conditionsCount) {
      if (this.once) {
        this.resolved = true
        this.removeConditions()
      }
      this.resolve()
    }
  }

  and (key) {
    this.keys.push(key)
    this.selectedKey = key
    return this
  }

  toBe (expectedVal) {
    return this.toFulfill(val => val === expectedVal)
  }

  toBeDefined () {
    return this.toFulfill(val => val !== undefined)
  }

  toBeChanged () {
    return this.toFulfill(() => true)
  }

  removeConditions () {
    for (const [conditionFn, { key }] of this.conditions.entries()) {
      this.origin.removeCondition(key, conditionFn)
    }
    this.conditions.clear()
  }

  cancel () {
    this.removeConditions()
    this.all.clear()
  }
}
