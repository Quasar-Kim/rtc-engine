const test = it

describe('RTCSocket', () => {
  describe('보내기', () => {
    test('보내려는 데이터가 바이너리가 아니면 JSON.stringify후 전송해야 함')
    test('writeEvent() 호출 시 이벤트 메시지 전송')
    test('바이너리 데이터 전송 시 데이터 버퍼가 꽉 차면 버퍼에 공간이 날 때까지 기다렸다가 전송해야 함')
    test('바이너리 데이터 전송 시 데이터가 버퍼 사이즈보다 크면 에러를 내야 함')
  })

  describe('받기', () => {
    test('바이너리 데이터를 받으면 data 이벤트를 발생시켜야 함')
    test('바이너리가 아닌 데이터를 받으면 JSON.parse후 data 이벤트를 발생시켜야 함')
    test('받은 데이터가 이벤트 메시지일 경우 적힌 이벤트를 발생시키고 data 이벤트는 발생시키지 말아야 함')
  })

  test('close() 호출 시 데이터 채널을 닫아야 함')
})
