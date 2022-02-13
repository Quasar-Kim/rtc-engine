const test = it

describe('ChunkProducer', () => {
  test('내부 버퍼에 공간이 있으면 데이터를 버퍼에 저장해야 함')
  test('내부 버퍼가 꽉 차면 데이터를 청크로 내보내야 함')
  test('flush() 호출 시 내부 버퍼의 남은 데이터를 청크로 내보내야 함')
})
