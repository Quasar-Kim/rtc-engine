import IntervalTimer from '../../../js/util/IntervalTimer.js'
import sinon from 'sinon'
import { expect } from '@esm-bundle/chai'

describe('IntervalTimer', function () {
  it('주기적으로 넘겨준 콜백을 실행해야 함', function (done) {
    this.timeout(100)

    let callCount = 0
    const timer = new IntervalTimer(() => {
      callCount++
      if (callCount === 2) done()
    }, 10)
  })

  describe('#reset()', function () {
    it('시간 간격을 처음부터 다시 세어야 함', async function () {
      const fake = sinon.fake()
      const timer = new IntervalTimer(fake, 10)

      // 5ms 대기
      await new Promise(resolve => setTimeout(resolve, 5))
      timer.reset()

      // 17ms 다시 대기
      await new Promise(resolve => setTimeout(resolve, 17))
      expect(fake.callCount).to.equal(1)
    })
  })
})
