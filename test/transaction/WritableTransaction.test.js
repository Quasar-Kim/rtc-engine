const test = it

describe('WritableTransaction', () => {
  test('데이터를 받으면 청킹 후 소켓으로 전송해야 함')
  test('상대측의 스트림이 cancel되면 에러를 발생시켜야 함')
  test('abort시 상대방에게 이벤트로 알려야 함')
  test('상대방쪽에서 일시정지시 이쪽도 일시정지 해야 함')
  test('상대방쪽에서 재시작 새 이쪽도 재시작해야 함')
  test('stop() 호출 시 전송을 중단해야 함')
  test('pause() 호출 시 전송을 잠시 멈추고 상대에게도 알려야 함')
  test('resume() 호출 시 전송을 다시 시작하고 상대에게도 알려야 함')
})
