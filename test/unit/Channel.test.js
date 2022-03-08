import Channel from '../../js/Channel.js'
import MockRTCSocket from '../test-util/MockRTCSocket.js'
import { expect } from '@esm-bundle/chai'

describe('Channel', () => {
  beforeEach(function () {
    this.socket = new MockRTCSocket()
    this.channel = new Channel(this.socket)
  })

  it('send() 호출 시 데이터를 전송해야 함', function () {
    const data = 'hell world'
    this.channel.send(data)
    expect(this.socket.write.getCall(0).args[0]).to.equal(data)
  })

  it('메시지를 받으면 message 이벤트를 발생시켜야 함', function (done) {
    const data = 'hell scott'
    this.channel.on('message', payload => {
      expect(payload).to.equal(data)
      done()
    })
    this.socket.emit('data', data)
  })
})
