import RTCEngine from '../../js/RTCEngine.js'
import LocalSignaler from '../../js/signaler/LocalSignaler.js'

const imgInput = document.querySelector('input')
const imgOutput = document.querySelector('img')

// 1. 엔진 셋업
const signaler = new LocalSignaler()
const engine = new RTCEngine(signaler)

// 2. 파일 인풋 받으면 transaction으로 파일 전송하기
imgInput.addEventListener('input', async () => {
  const file = imgInput.files[0]
  const transaction = await engine.writable({
    size: file.size
  })

  file.stream().pipeTo(transaction.stream)
})

// 3. 파일 받기
async function receive () {
  for await (const transaction of engine.readables()) {
    // 1. 청크 모으기
    const chunks = []
    await transaction.stream.pipeTo(new WritableStream({
      write: chunk => {
        chunks.push(chunk)
      }
    }))

    // 2. 청크를 blob로 만들기
    const blob = new Blob(chunks)

    // 3. blob를 object url로 바꾸고 이미지로 표시하기
    imgOutput.src = URL.createObjectURL(blob)
  }
}

receive()
