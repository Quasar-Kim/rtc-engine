import LocalSignaler from '../../../js/signaler/LocalSignaler.js'
import MockBroadcastChannel from '../../test-util/MockBroadcastChannel.js'
import { expect } from '@esm-bundle/chai'

const originalBroadcastChannel = window.BroadcastChannel

describe('LocalSignaler', function () {
  beforeEach(function () {
    window.BroadcastChannel = MockBroadcastChannel
  })

  it('heartbeatInterval으로 설정된 간격으로 heartbeat 메시지를 보내야 함', async function () {
    const signaler = new LocalSignaler({
      heartbeatInterval: 100
    })

    await new Promise(resolve => setTimeout(resolve, 150))
    expect(JSON.parse(signaler.bc.postMessage.lastCall.firstArg).type).to.equal('heartbeat')
  })

  it('상대에게서 heartbeat 메시지를 받으면 연결된걸로 간주해야 함', async function () {
    const signaler = new LocalSignaler()
    const callback = signaler.bc.addEventListener.firstCall.lastArg
    const evt = {
      data: JSON.stringify({
        type: 'heartbeat'
      })
    }
    callback.apply(signaler, [evt])

    expect(signaler.ready.val).to.equal(true)
  })

  it('상대에게서 heartbeat 메시지를 heartbeatTimeout으로 설정된 간격만큼 받지 못하면 연결이 끊긴걸로 간주해야 함', async function () {
    const signaler = new LocalSignaler({
      heartbeatTimeout: 10
    })

    const injectHeartbeat = () => {
      const callback = signaler.bc.addEventListener.firstCall.lastArg
      const evt = {
        data: JSON.stringify({
          type: 'heartbeat'
        })
      }
      callback.apply(signaler, [evt])
    }

    // 먼저 ready를 true로 만들어주고
    injectHeartbeat()
    expect(signaler.ready.val).to.equal(true)

    // 20ms 대기
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(signaler.ready.val).to.equal(false)
  })

  describe('#send()', function () {
    it('broadcastChannel으로 메시지를 전송해야 함', function () {
      const signaler = new LocalSignaler({
        heartbeatInterval: 100000 // heartbeat 메시지 잠시 중단
      })

      const msg = {
        title: 'the first penguin',
        album: 'yearbook 2018',
        artist: '051B'
      }

      signaler.send(msg)

      expect(JSON.parse(signaler.bc.postMessage.lastCall.lastArg)).to.deep.equal(msg)
    })
  })

  describe('#close()', function () {
    it('broadcastChannel의 close() 메소드를 호출해야 함', function () {
      const signaler = new LocalSignaler()
      signaler.close()
      expect(signaler.bc.close.called).to.equal(true)
    })
  })

  afterEach(function () {
    window.BroadcastChannel = originalBroadcastChannel
  })
})
