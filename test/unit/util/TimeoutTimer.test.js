import TimeoutTimer from '../../../js/util/TimeoutTimer.js'
import sinon from 'sinon'
import { expect } from '@esm-bundle/chai'

describe('TimeoutTimer', function () {
  it('timeout만큼 시간이 지난 후 넘겨준 콜백을 실행해야 함', function (done) {
    this.timeout(100)

    const timer = new TimeoutTimer(() => done(), 10)
  })

  describe('#reset()', function () {
    it('시간 간격을 처음부터 다시 세어야 함', async function () {
      const fake = sinon.fake()
      const timer = new TimeoutTimer(fake, 10)

      // 5ms 대기
      await new Promise(resolve => setTimeout(resolve, 5))
      timer.reset()

      // 7ms 다시 대기
      await new Promise(resolve => setTimeout(resolve, 7))
      expect(fake.called).to.equal(false)
    })
  })
})
