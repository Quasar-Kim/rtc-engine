import RTCEngine from '../../js/RTCEngine.js'
import SocketSignaler from '../../js/signaler/SocketSignaler.js'
import FileSaver from '../FileSaver.js'
import once from '../../js/util/once.js'
import { wait } from '../../js/util/ObservableClass.js'

// const signaler = new SocketSignaler('http://localhost:3000')
const signaler = new SocketSignaler('https://192.168.0.17:3000')
const engine = new RTCEngine(signaler, { autoConnect: false })

document.querySelector('#createTransactionBtn').addEventListener('click', async () => {
  // 시그널러 셋업
  await signaler.createSessionCode()
  await signaler.waitForConnection()

  // 연결
  await engine.connect()

  // 파일 입력 받기
  const fileInputElem = document.querySelector('#fileInput')
  await once(fileInputElem, 'change')
  const file = fileInputElem.files[0]

  // 파일 보내기
  // const transaction = await engine.writable('test', {
  //     name: file.name,
  //     size: file.size
  // })
  const channel = await engine.channel('file')
  const transaction = await channel.send(file)

  // 플로우 컨트롤
  document.querySelector('#senderFlowToggleBtn').addEventListener('click', () => {
    if (transaction.paused.get()) {
      transaction.resume()
    } else {
      transaction.pause()
    }
  })
  document.querySelector('#abortBtn').addEventListener('click', () => transaction.stop())

  // 속도, ETA 등 전송 트레킹 기능 테스트
  setInterval(() => {
    const state = document.querySelector('#senderStateText')
    state.innerHTML = `
        <ul>
            <li>${transaction.progress} %</li>
            <li>${transaction.eta}s 남음</li>
            <li>${transaction.speed}</li>
        </ul>
        `
    state.style.color = transaction.paused.get() ? 'red' : 'blue'
  }, 1000)

  await wait(transaction.done).toBe(true)
})

document.querySelector('#submitSessionCodeBtn').addEventListener('click', async () => {
  const sessionCode = document.querySelector('#sessionCodeInput').value
  await signaler.connect(sessionCode)

  await engine.connect()

  // 파일 받기
  // const transaction = await engine.readable('test')
  const channel = await engine.channel('file')
  const transaction = await once(channel, 'transaction')
  const fileSaver = new FileSaver()
  const destination = await fileSaver.open(transaction.metadata)

  // 플로우 컨트롤
  document.querySelector('#receiverFlowToggleBtn').addEventListener('click', () => {
    if (transaction.paused.get()) {
      transaction.resume()
    } else {
      transaction.pause()
    }
  })
  document.querySelector('#cancelBtn').addEventListener('click', () => transaction.stop())

  // 속도, ETA 등 전송 트레킹 기능 테스트
  setInterval(() => {
    const state = document.querySelector('#receiverStateText')
    state.innerHTML = `
            <ul>
                <li>${transaction.progress} %</li>
                <li>${transaction.eta}s 남음</li>
                <li>${transaction.speed}</li>
            </ul>
            `
    state.style.color = transaction.paused.get() ? 'red' : 'blue'
  }, 1000)

  await transaction.stream.pipeTo(destination)
})
