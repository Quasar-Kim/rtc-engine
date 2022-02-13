const test = it

describe('Queue', () => {
  test('push() 호출 시 데이터를 가장 뒤에 저장해야 함')
  test('pop() 호출 시 가장 앞의 데이터를 빼고 리턴해야 함')
  test('size 속성 접근 시 데이터의 개수를 리턴해야 함')
  test('flush() 호출 시 모든 데이터를 비워야 함')
  test('iterator 이용 시 들어온 순서대로 데이터를 yield 해야 함')
})
