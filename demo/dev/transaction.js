import RTCEngine from '../../js/RTCEngine.js'
import { observe } from '../../js/util/index.js'
import BroadcastChannelSignaler from './BroadcastChannelSignaler.js'
import FileSaver from '../../test/test-util/FileSaver.js'

// -------------------
// engine logging
const engineLogList = document.querySelector('#engineLog')

function createLogEntry (log) {
  const logEntry = document.createElement('details')
  const summary = document.createElement('summary')
  const pre = document.createElement('pre')
  logEntry.append(summary, pre)

  // 100자 이상이면 pre안에 전부 보여주기
  if (log.length > 100) {
    summary.textContent = log.substring(0, 100) + '...'
  } else {
    summary.textContent = log
  }
  pre.textContent = log

  return logEntry
}

function logEngine (msg) {
  const time = (new Date()).toLocaleTimeString('en-US', { hour12: false })
  const log = `[${time}] ${msg}`
  const logEntry = createLogEntry(log)
  engineLogList.appendChild(logEntry)
  logEntry.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

// -------------------
// RTC connection
const connectBtn = document.querySelector('#connect')

const signaler = new BroadcastChannelSignaler()
const engine = new RTCEngine(signaler, { autoConnect: false })

// 연결 상태 보여주기
observe(engine.connection).toBeChanged().then(connection => {
  logEngine(`connection state: ${connection}`)
})

// connect 버튼 누르면 연결하기
connectBtn.addEventListener('click', () => {
  logEngine('engine started')
  connectBtn.disabled = true
  engine.connect()
})

// -------------------
// Transfer
const transactionsList = document.querySelector('#transactionsList')
const transactionDetailSection = document.querySelector('#detail')
const toggleBtn = document.querySelector('#togglePauseResume')
const stopBtn = document.querySelector('#stop')
const setDirBtn = document.querySelector('#setDir')

// key: <option> element, value: <div> element holding details
const transactionDetails = new Map()
const fileSaver = new FileSaver()
const transactionSymbol = Symbol('transaction')

function createTransactionDetail (transaction, direction) {
  // <option> 만들고 리스트에 추가하기
  const option = document.createElement('option')

  if (direction === 'outgoing') {
    option.textContent = `⬆ ${transaction.metadata.name}`
  } else {
    option.textContent = `⬇ ${transaction.metadata.name}`
  }

  option[transactionSymbol] = transaction
  transactionsList.appendChild(option)

  // 디테일 만들고 map에 추가하기
  const details = document.createElement('div')
  details.innerHTML = `
    <h2>${transaction.label}</h2>
    <ul>
      <li>File: ${transaction.metadata.name}</li>
      <li>Size: ${transaction.metadata.size}</li>
      <li>Sent/Received: 0</li>
      <li>ETA: unknown</li>
      <li>Speed: unknown</li>
    </ul>
  `
  transactionDetails.set(option, details)
  const sent = details.querySelectorAll('li')[2]
  const eta = details.querySelectorAll('li')[3]
  const speed = details.querySelectorAll('li')[4]

  // 디테일과 트렌젝션 연동시키기
  transaction.on('report', report => {
    sent.textContent = `Sent: ${report.processed} (${report.progress * 100} %)`
    eta.textContent = `ETA: ${report.eta} seconds`
    speed.textContent = `Speed: ${report.speed}`
  })

  return option
}

// 파일 전송하기
async function transfer (file) {
  const fileDetail = {
    name: file.name,
    size: file.size
  }

  // 트렌젝션 만들기
  const transaction = await engine.writable(undefined, fileDetail)
  logEngine(`outgoing transaction opened for file ${file.name}`)

  // 트렌젝션 리스트에 보여주기
  const option = createTransactionDetail(transaction, 'outgoing')

  // 파일 보내기
  file.stream().pipeTo(transaction.stream)
    .then(() => logEngine(`sent ${file.name} successfully`))
    .catch(err => logEngine(`failed to send ${file.name}. ${err}`))
    .finally(() => {
      option.remove()
      transactionDetails.delete(option)
    })
}

// transaction 선택 시 디테일 보여주기
transactionsList.addEventListener('change', () => {
  const selectedOption = transactionsList.options[transactionsList.selectedIndex]
  const detail = transactionDetails.get(selectedOption)
  transactionDetailSection.innerHTML = ''
  transactionDetailSection.appendChild(detail)
})

// pause / resume 버튼 클릭 시 전송 상태 토글하기
toggleBtn.addEventListener('click', () => {
  const selectedOption = transactionsList.options[transactionsList.selectedIndex]
  if (!selectedOption) return

  const transaction = selectedOption[transactionSymbol]
  if (transaction.paused.get()) {
    transaction.resume()
  } else {
    transaction.pause()
  }
})

// stop 버튼 클릭 시 트렌젝션 닫기
stopBtn.addEventListener('click', () => {
  const selectedOption = transactionsList.options[transactionsList.selectedIndex]
  if (!selectedOption) return

  const transaction = selectedOption[transactionSymbol]
  transaction.stop()
})

// setDir 버튼 클릭 시 파일 저장 권한 받기
setDirBtn.addEventListener('click', async () => {
  try {
    await fileSaver.obtainPermission()
    logEngine('directory permission obtained')
  } catch {
    logEngine('failed to obtain directory permission')
  }
})

// 트렌젝션 받기
async function receiveTransaction () {
  for await (const transaction of engine.readables()) {
    const { name } = transaction.metadata
    const dest = await fileSaver.open(transaction.metadata)
    logEngine(`incoming transaction opened for the file ${name}`)

    const option = createTransactionDetail(transaction, 'incoming')

    transaction.stream.pipeTo(dest)
      .then(() => logEngine(`received ${name} successfully`))
      .catch(err => logEngine(`failed to receive ${name}. ${err}`))
      .finally(() => {
        option.remove()
        transactionDetails.delete(option)
      })
  }
}
receiveTransaction()

// 파일을 보내거나 받는 중에는 나가려고 하면 한번 막기
window.addEventListener('beforeunload', evt => {
  if (transactionsList.childElementCount === 0) return

  evt.returnValue = '어짜피 여기 뭐라고 적든 안보임'
})

// -------------------
// transfer pod
const pod = document.querySelector('#transferPod')

// 파일을 드롭하면 transaction을 생성하고 상대방에게 전송하기
pod.addEventListener('drop', evt => {
  evt.preventDefault()

  if (evt.dataTransfer.length > 0) return

  for (const item of evt.dataTransfer.items) {
    if (item.kind !== 'file') continue

    const file = item.getAsFile()
    transfer(file)
  }
})

pod.addEventListener('dragover', evt => {
  evt.preventDefault()
})

// 클릭해도 파일 선택할수 있게 하기
pod.addEventListener('click', () => {
  const input = document.createElement('input')
  input.type = 'file'

  input.addEventListener('change', async () => {
    for (const file of input.files) {
      transfer(file)
    }
  }, { once: true })

  input.click()
})
