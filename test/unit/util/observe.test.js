import { ObservableEntry, observe } from '../../../js/util/ObservableEntry.js'
import sinon from 'sinon'
import { expect } from '@esm-bundle/chai'

describe('observe', () => {
  it('should call callback passed to onChange when value changes', async () => {
    const callback = sinon.fake()
    const prop = new ObservableEntry()
    observe(prop).toBeChanged().then(callback)

    // first & second change
    prop.set('a')
    prop.set('b')

    expect(callback.lastCall.firstArg).to.equal('b')
    expect(callback.callCount).to.equal(2)
  })

  it('should cancel observing when cancel function passed as second arg is called', () => {
    const callback = sinon.fake()
    const prop = new ObservableEntry()
    observe(prop).toBeChanged().then((newVal, cancel) => {
      callback()
      cancel()
    })

    // first change, onChange 실행됨
    prop.set('hello')

    // second change, onChange 실행 안됨
    prop.set('bye')

    expect(callback.callCount).to.equal(1)
  })
})
