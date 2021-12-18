import Mitt from '../util/Mitt.js'

// 시그널러가 구현해야 할 기능:
//  - send(data)로 메시지 보내기
//  - send의 data 인수와 동일한 데이터를 'message' 이벤트로 이미팅하기
//  - ready 속성 접근시 시그널러가 사용 가능해질때(send 사용시 아무런 문제가 생기지 않을때)
//    resolve하는 promise 리턴
export default class Bass extends Mitt {
  send (data) {}

  get ready () {
    return Promise.resolve()
  }
}