import MockDataChannel from '../test-util/MockDataChannel.js'
import RTCSocket from '../../js/RTCSocket.js'

describe('RTCSocket', () => {
  beforeEach(function () {
    this.dc = new MockDataChannel()
    this.socket = new RTCSocket(this.dc)
  })

  describe('보낼 때', () => {
    it('보내려는 데이터가 바이너리가 아니면 stringify후 전송해야 함', async function () {
      const data = {
        no: 'space'
      }

      await this.socket.write(data)

      const msg = JSON.parse(this.dc.send.getCall(0).args[0])
      expect(msg).to.deep.equal(data)
    })

    it('writeEvent() 호출 시 이벤트 메시지 전송', async function () {
      await this.socket.writeEvent('event-name', {
        name: 'scott'
      })

      const msg = JSON.parse(this.dc.send.getCall(0).args)
      expect(msg).to.deep.equal({
        _channelEngineCustomEvent: true,
        event: 'event-name',
        payload: {
          name: 'scott'
        }
      })
    })

    it('바이너리 데이터 전송 시 데이터 채널의 버퍼가 꽉 차 있으면 공간이 날 때까지 기다렸다가 전송해야 함', async function () {
      // 데이터 채널의 버퍼가 꽉 찬것처럼 보이도록
      this.dc.bufferedAmount = Infinity

      const data = new ArrayBuffer(10)
      const writePromise = this.socket.write(data)

      // 한 task 대기
      await new Promise(resolve => setTimeout(resolve))

      expect(this.dc.send.called).to.equal(false)

      // 데이터 채널 버퍼가 빈것처럼 보이도록
      this.dc.bufferedAmount = 0
      this.dc.emit('bufferedamountlow')

      await writePromise
      expect(this.dc.send.getCall(0).args[0]).to.equal(data)
    })
    it('바이너리 데이터 전송 시 데이터가 버퍼 사이즈보다 크면 에러를 내야 함', function (done) {
      const bigData = new ArrayBuffer(20 * 1024 * 1024) // 20MB
      this.socket.write(bigData).catch(() => done())
    })
    it('데이터 채널의 readyState가 open이 아니라면 open될때까지 기다렸다 전송해야 함', async function () {
      this.dc.readyState = 'closed'

      const data = new ArrayBuffer(10)
      const writePromise = this.socket.write(data)

      // 한 task 대기
      await new Promise(resolve => setTimeout(resolve))

      expect(this.dc.send.called).to.equal(false)

      this.dc.readyState = 'open'
      this.dc.emit('open')

      await writePromise
      expect(this.dc.send.getCall(0).args[0]).to.equal(data)
    })
  })

  describe('받기', () => {
    it('바이너리 데이터를 받으면 data 이벤트를 발생시켜야 함', function (done) {
      const data = new ArrayBuffer(10)
      this.socket.on('data', payload => {
        expect(data).to.equal(payload)
        done()
      })
      this.dc.emit('message', { data })
    })

    it('바이너리가 아닌 데이터를 받으면 JSON.parse후 data 이벤트를 발생시켜야 함', function (done) {
      const data = { name: 'scott' }
      this.socket.on('data', payload => {
        expect(data).to.deep.equal(payload)
        done()
      })
      this.dc.emit('message', { data: JSON.stringify(data) })
    })

    it('받은 데이터가 이벤트 메시지일 경우 적힌 이벤트를 발생시켜야 함', function (done) {
      const data = {
        _channelEngineCustomEvent: true,
        event: 'villager',
        payload: 'scott'
      }
      this.socket.on('villager', payload => {
        expect(payload).to.equal('scott')
        done()
      })
      this.dc.emit('message', { data: JSON.stringify(data) })
    })
  })

  it('close() 호출 시 데이터 채널을 닫아야 함', function () {
    this.socket.close()
    expect(this.dc.close.called).to.equal(true)
  })
  it('received 옵션이 설정되어 있을 경우 만들어 질 때 __received 이벤트를 상대에게 보내야 함', function () {
    // eslint-disable-next-line no-unused-vars
    const socket = new RTCSocket(this.dc, { received: true })

    const msgSent = JSON.parse(this.dc.send.getCall(0).args[0])
    expect(msgSent).to.deep.equal({
      _channelEngineCustomEvent: true,
      event: '__received'
    })
  })
})
