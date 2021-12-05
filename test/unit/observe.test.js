import { observe } from '../../js/util/ObservableClass.js'
import { ObservableEntry } from '../../js/util/ObservableEntry.js'
import spies from 'https://jspm.dev/chai-spies'

chai.use(spies)

describe('observe', () => {
  it('should call callback passed to onChange when value changes', async () => {
    const callback = chai.spy()
    const prop = new ObservableEntry()
    observe(prop).onChange(callback)

    // first & second change
    prop.set('a')
    prop.set('b')

    expect(callback).to.have.been.called.with('b')
    // eslint-disable-next-line no-unused-expressions
    expect(callback).to.have.been.called.twice
  })

  it('should cancel observing when cancel function passed as second arg is called', () => {
    const callback = chai.spy()
    const prop = new ObservableEntry()
    observe(prop).onChange((newVal, cancel) => {
      callback()
      cancel()
    })

    // first change, onChange 실행됨
    prop.set('hello')

    // second change, onChange 실행 안됨
    prop.set('bye')

    // eslint-disable-next-line no-unused-expressions
    expect(callback).to.have.been.called.once
  })
})
