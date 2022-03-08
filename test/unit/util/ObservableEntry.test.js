import { ObservableEntry } from '../../../js/util/ObservableEntry.js'
import { expect } from '@esm-bundle/chai'
import sinon from 'sinon'

describe('observableEntry', () => {
  it('should provide access to the actual value via get() and set()', () => {
    const prop = new ObservableEntry()
    prop.set('hello')
    expect(prop.get()).to.equal('hello')
  })

  it('should call matchedCallback when condition passed to registerCallback() is met', done => {
    const prop = new ObservableEntry()
    prop.registerCallback(
      val => val === 'hi',
      () => done(),
      () => {}
    )
    prop.set('hi')
  })

  it('should call unmatchedCallback when condition passed to registerCallback() is not met', done => {
    const prop = new ObservableEntry()
    prop.registerCallback(
      val => val === 'hi',
      () => {},
      () => done()
    )
    prop.set('not hi')
  })

  it('should prevent calling callbacks when returned cancel function is called', () => {
    const prop = new ObservableEntry()

    function errorThrower () {
      throw new Error('callbacks called')
    }

    const cancel = prop.registerCallback(
      val => val === 'hi',
      errorThrower,
      errorThrower
    )
    cancel()
    prop.set('no hi')
  })

  it('should test specific condition passed to testCondition()', () => {
    const prop = new ObservableEntry()

    const conditionA = sinon.fake.returns(true)
    const conditionB = sinon.fake.returns(true)
    const callbackA = sinon.spy()
    const callbackB = sinon.spy()
    prop.registerCallback(conditionA, callbackA, () => {})
    prop.registerCallback(conditionB, callbackB, () => {})

    prop.testCondition(conditionA)

    expect(conditionA.called).to.equal(true)
    expect(callbackA.called).to.equal(true)
    expect(conditionB.called).to.equal(false)
    expect(callbackB.called).to.equal(false)
  })

  it('should test all registered conditions when testConditionsAll() is called', () => {
    const prop = new ObservableEntry()
    const spy1 = sinon.spy()
    const spy2 = sinon.spy()
    const condition = () => true

    prop.registerCallback(condition, spy1, () => {})
    prop.registerCallback(condition, spy2, () => {})
    prop.testConditionsAll()

    expect(spy1.called).to.equal(true)
    expect(spy2.called).to.equal(true)
  })
})
