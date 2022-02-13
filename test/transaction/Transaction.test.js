const test = it

describe('Transaction', () => {
  test('eta 속성 접근 시 남은 초를 리턴해야 함')
  test('progress 속성 접근 시 전송 진행률을 리턴해야 함')
  test('speed 속성 접근 시 전송 속도를 리턴해야 함')
  test('pause() 호출 시 속도 계산을 중단해야 함')
  test('resume() 호출 시 속도 계산을 다시 시작해야 함')
})
