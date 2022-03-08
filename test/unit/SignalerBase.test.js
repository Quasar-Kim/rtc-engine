import SignalerBase from '../../js/signaler/Base.js'
import MockSignaler from '../test-util/MockSignaler.js'
import { expect } from '@esm-bundle/chai'

describe('SignalerBase', function () {
  it('receive() 호출 시 메시지의 타입에 해당하는 이벤트를 emit해야 함', function (done) {
    const base = new SignalerBase()
    const sent = {
      type: 'role',
      seed: 0.5
    }

    base.on('role', received => {
      expect(received).to.deep.equal(sent)
      done()
    })

    base.receive(sent)
  })

  it('receive() 호출 시 메시지의 타입에 해당하는 이벤트의 리스너가 없다면 리스너가 추가되면 emit해야 함', function (done) {
    const base = new SignalerBase()
    const sent = {
      type: 'role',
      seed: 0.5
    }

    base.receive(sent)

    base.on('role', received => {
      expect(received).to.deep.equal(sent)
      done()
    })
  })

  it('receive() 호출 시 메시지에 type 필드가 없다면 에러내야 함', function () {
    const base = new SignalerBase()
    const sent = {
      seed: 0.5
    }

    expect(() => base.receive(sent)).to.throw('Received message does not include \'type\' field')
  })
})
