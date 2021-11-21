import RTCEngine from '../../js/RTCEngine.js'
import SocketSignaler from '../../js/signaler/SocketSignaler.js'
import FileSaver from '../FileSaver.js'
import once from '../../js/util/once.js'

const signaler = new SocketSignaler('http://localhost:3000')
const engine = new RTCEngine(signaler, { autoConnect: false })

document.querySelector('#createTransactionBtn').addEventListener('click', async () => {
    // 시그널러 셋업
    await signaler.createSessionCode()
    await signaler.waitForConnection()
    
    // 연결
    await engine.connect()
    const channel = await engine.channel('file')

    // 파일 입력 받기
    const fileInputElem = document.querySelector('#fileInput')
    await once(fileInputElem, 'change')
    const file = fileInputElem.files[0]

    // 파일 정보 입력
    channel.send({ 
        name: file.name,
        size: file.size
    })

    // 파일 보내기
    const transaction = await engine.writable('test', { size: file.size })
    await file.stream().pipeTo(transaction.stream)
    console.log('transaction done')
})

document.querySelector('#submitSessionCodeBtn').addEventListener('click', async () => {
    const sessionCode = document.querySelector('#sessionCodeInput').value
    await signaler.connect(sessionCode)

    await engine.connect()

    // 파일 정보 받기
    const channel = await engine.channel('file')
    const fileInfo = await once(channel, 'message')

    // 파일 받기
    const transaction = await engine.readable('test', { size: fileInfo.size })
    const fileSaver = new FileSaver()
    const destination = await fileSaver.open(fileInfo)
    
    await transaction.stream.pipeTo(destination)
    console.log('receiving done')
})
