import RTCEngine from '../../js/RTCEngine.js'

describe('plugin', () => {
  it('plugin() 호출 시 플러그인 함수를 RTCEngine 클래스를 첫번째 인자로 호출해야 함', function (done) {
    RTCEngine.plugin(Engine => {
      expect(Engine).to.equal(RTCEngine)
      done()
    })
  })
})
