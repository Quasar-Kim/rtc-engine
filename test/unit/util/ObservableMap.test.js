import ObservableMap from '../../../js/util/ObservableMap.js'
import { expect } from '@esm-bundle/chai'

describe('ObservableMap', () => {
  it('get() should return set value', () => {
    const map = new ObservableMap()
    map.set('color', 'blue')
    expect(map.get('color')).to.equal('blue')
  })

  describe('wait', () => {
    it('toFulfill(conditionFn) should resolve if conditionFn returns true', done => {
      const map = new ObservableMap()
      map.wait('color').toFulfill(color => color === 'blue').then(val => {
        expect(val).to.equal('blue')
        done()
      })
      map.set('color', 'blue')
    })

    it('toBe(expected) should resolve expected matches(===) changed value', done => {
      const map = new ObservableMap()
      map.wait('color').toBe('blue').then(val => {
        expect(val).to.equal('blue')
        done()
      })
      map.set('color', 'blue')
    })

    it('toBeDefined() should resolve if changed value is not undefined', done => {
      const map = new ObservableMap()
      map.wait('color').toBeDefined().then(val => {
        expect(val).to.equal('blue')
        done()
      })
      map.set('color', 'blue')
    })

    it('toBeChanged() should resolve on change', done => {
      const map = new ObservableMap()
      map.wait('color').toBeChanged().then(val => {
        expect(val).to.equal('blue')
        done()
      })
      map.set('color', 'blue')
    })
  })
})
