import { ObservableEntry, waitAll } from '../../../js/util/ObservableEntry.js'
import { expect } from '@esm-bundle/chai'

describe('waitAll()', () => {
  it('should resolve when all nested wait expressions are resolved', async () => {
    const prop1 = new ObservableEntry()
    const prop2 = new ObservableEntry()

    setTimeout(() => {
      prop1.set('hi')
      prop1.set('hell o')
      prop1.set('hello')
      prop2.set('there')
    })

    await waitAll(wait => {
      wait(prop1).toBe('hello')
      wait(prop2).toBe('there')
    })

    expect(prop1.get()).to.equal('hello')
    expect(prop2.get()).to.equal('there')
  })
})
