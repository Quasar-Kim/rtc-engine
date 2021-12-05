import { ObservableEntry } from '../../js/util/ObservableEntry.js'

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

    const conditionA = chai.spy.returns(true)
    const conditionB = chai.spy.returns(true)
    const callbackA = chai.spy()
    const callbackB = chai.spy()
    prop.registerCallback(conditionA, callbackA, () => {})
    prop.registerCallback(conditionB, callbackB, () => {})

    prop.testCondition(conditionA)

    expect(conditionA).to.have.been.called()
    expect(callbackA).to.have.been.called()
    expect(conditionB).to.not.have.been.called()
    expect(callbackB).to.not.have.been.called()
  })

  it('should test all registered conditions when testConditionsAll() is called', () => {
    const prop = new ObservableEntry()
    const spy1 = chai.spy()
    const spy2 = chai.spy()
    const condition = () => true

    prop.registerCallback(condition, spy1, () => {})
    prop.registerCallback(condition, spy2, () => {})
    prop.testConditionsAll()

    expect(spy1).to.have.been.called()
    expect(spy2).to.have.been.called()
  })
})
