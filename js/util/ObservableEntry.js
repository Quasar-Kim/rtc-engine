import Queue from './Queue.js'

export class ObservableEntry {
  constructor () {
    this.val = undefined
    this.conditions = new Set()
    this.callbacks = new Map()
  }

  set (val) {
    const changed = val !== this.val
    this.val = val

    if (changed) {
      this.testConditionsAll()
    }
  }

  get () {
    return this.val
  }

  registerCallback (condition, matchedCallback, unmatchedCallback) {
    // 있으면 있는 컨디션 이용
    if (!this.conditions.has(condition)) {
      this.conditions.add(condition)
      this.callbacks.set(condition, new Set())
    }

    // condition에 추가
    const callbackPairs = this.callbacks.get(condition)
    const callbackPair = [matchedCallback, unmatchedCallback]
    callbackPairs.add(callbackPair)

    // 취소용 함수 리턴
    return () => {
      callbackPairs.delete(callbackPair)

      // callbackPair를 가지지 않는 컨디션은 삭제
      if (callbackPairs.size > 0) return
      this.callbacks.delete(callbackPairs)
      this.conditions.delete(condition)
    }
  }

  testConditionsAll () {
    for (const condition of this.conditions.values()) {
      this.testCondition(condition)
    }
  }

  testCondition (condition) {
    const matched = condition(this.val)
    for (const [matchedCallback, unmatchedCallback] of this.callbacks.get(condition)) {
      if (matched) {
        matchedCallback(this.val)
      } else {
        unmatchedCallback(this.val)
      }
    }
  }
}

function waitToBeDefined (val) {
  return val !== undefined
}

function waitToBeChanged () {
  return true
}

export class WaitEntry {
  /**
   * @param {object} param
   * @param {ObservableEntry} param.observableEntry
   * @param {Function} param.unmatchedCallback
   * @param {boolean} param.once
   */
  constructor ({ observableEntry, unmatchedCallback = () => {}, once = true }) {
    this.promiseCallbacks = new Queue()
    this.resolved = false
    this.once = true
    this.cancel = () => {}

    this.observableEntry = observableEntry
    this.unmatchedCallback = unmatchedCallback
    this.once = once
  }

  // thenable 구현
  // reject 할일 없으므로 두번째 인수 안받음
  then (fulfill) {
    this.promiseCallbacks.push(fulfill)
    if (this.resolved) this.resolve()
  }

  resolve (newVal) {
    // once: false면 콜백 비우지 X
    // while (this.promiseCallbacks.size > 0) {
    //   const callback = this.promiseCallbacks.pop();
    //   callback(newVal);
    // }
    for (const callback of this.promiseCallbacks) {
      callback(newVal)
    }

    if (this.once) {
      this.promiseCallbacks.flush()
    }
  }

  // 사용 가능한 컨디션들
  toFulfill (condition, checkImmediate = true) {
    const conditionMetCallback = newVal => {
      this.resolve(newVal)

      if (this.once) {
        this.cancel()
        // promise처럼 작동할때처럼 필요, once === false인 경우 항상 resolved === false
        this.resolved = true
      }
    }

    if (checkImmediate) {
      const currentVal = this.observableEntry.val
      if (condition(currentVal)) conditionMetCallback(currentVal)
    }

    this.cancel = this.observableEntry.registerCallback(condition, conditionMetCallback, () => {
      this.unmatchedCallback()
    })

    // then() 가능하게 하기 위해서
    return this
  }

  toBe (expectedVal) {
    return this.toFulfill((val) => val === expectedVal)
  }

  toBeDefined () {
    return this.toFulfill(waitToBeDefined)
  }

  toBeChanged () {
    return this.toFulfill(waitToBeChanged, false)
  }
}
