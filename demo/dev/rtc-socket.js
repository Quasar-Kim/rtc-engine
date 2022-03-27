import RTCEngine from '../../js/RTCEngine.js'
import { wait, observe } from '../../js/util/index.js'
import LocalSignaler from '../../js/signaler/LocalSignaler.js'

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
  logEntry.scrollIntoView()
}

// -------------------
// RTC connection
const connectBtn = document.querySelector('#connect')
const closeBtn = document.querySelector('#close')
const stateText = document.querySelector('#state')

const signaler = new LocalSignaler()
const engine = new RTCEngine(signaler, { autoConnect: false })

// connect 버튼 누르면 connect() 메소드 부르기
connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true

  try {
    logEngine('engine started')
    await engine.connect()
  } finally {
    connectBtn.disabled = false
    closeBtn.disabled = false
  }
})

closeBtn.addEventListener('click', () => {
  engine.close()
  connectBtn.disabled = true
  closeBtn.disabled = true
})

// 연결 상태 보여주기
observe(engine.connection).toBeChanged().then(connection => {
  logEngine(`connection state: ${connection}`)
  stateText.textContent = `connection state: ${connection}`
})

// 연결이 완전히 닫히면 페이지를 리프래쉬해달라는 메시지 표시하기
wait(engine.closed).toBe(true).then(() => {
  stateText.textContent = '연결이 닫혔습니다. 새로운 연결을 시작하려면 페이지를 새로고침하세요.'
  connectBtn.disabled = true
  closeBtn.disabled = true
  logEngine('connection closed')
})

// -------------------
// socket list & socket details
const socketList = document.querySelector('#sockets')
const chat = document.querySelector('#chat')

// key: socket, value: document fragment of socket
const messages = new Map()

function createSocketDetail (socket) {
  const doc = document.createElement('div')
  const span = document.createElement('span')
  const title = document.createElement('h2')
  title.textContent = `Chat - ${socket.label}`
  const log = document.createElement('div')
  log.className = 'log'

  const msgInputForm = document.createElement('form')
  msgInputForm.className = 'msg-input-div'
  const msgInput = document.createElement('input')
  const sendBtn = document.createElement('input')
  sendBtn.type = 'submit'
  sendBtn.value = 'send'
  msgInputForm.append(msgInput, sendBtn)

  // form submit 시 메시지 보내기
  msgInputForm.addEventListener('submit', evt => {
    evt.preventDefault()

    const msg = msgInput.value
    socket.write(msg)
    logSocket(socket, msg, 'outgoing')
    msgInput.value = ''
  })

  // TODO: socket state span에다가 표시하기

  doc.append(title, span, log, msgInputForm)
  return doc
}

// socket에 해당하는 document fragment를 생성하고 거기에다가 로그 추가
function logSocket (socket, msg, direction) {
  if (!messages.has(socket)) {
    const doc = createSocketDetail(socket)
    messages.set(socket, doc)
  }

  const doc = messages.get(socket)
  const socketLogList = doc.querySelector('div.log')
  const time = (new Date()).toLocaleTimeString('en-US', { hour12: false })

  if (direction === 'outgoing') {
    const log = `⬆ [${time}] ${msg}`
    const logEntry = createLogEntry(log)
    logEntry.className = 'outgoing-msg'
    socketLogList.appendChild(logEntry)
    logEntry.scrollIntoView()
  } else if (direction === 'incoming') {
    const log = `⬇ [${time}] ${msg}`
    const logEntry = createLogEntry(log)
    logEntry.className = 'incoming-msg'
    socketLogList.appendChild(logEntry)
    logEntry.scrollIntoView()
  }
}

// 선택된 소켓의 채팅과 디테일 보여주기
function showSocketDetail (option) {
  const socket = option[socketSymbol]

  if (!messages.has(socket)) {
    const doc = createSocketDetail(socket)
    messages.set(socket, doc)
  }

  const doc = messages.get(socket)

  chat.innerHTML = ''
  chat.appendChild(doc)
}

const addBtn = document.querySelector('#add')
const closeSocketBtn = document.querySelector('#closeSocket')
const socketIDInput = document.querySelector('#socketID')

const socketSymbol = Symbol('socket object')

function addSocketEntry (socket) {
  const option = document.createElement('option')
  option.value = socket.label
  option.textContent = socket.label
  option[socketSymbol] = socket
  socketList.appendChild(option)

  // 소켓의 메시지가 왔을 때 로그 기능 추가
  socket.on('data', msg => {
    logSocket(socket, msg, 'incoming')
  })

  // 소켓이 닫히면 연결된 뷰도 닫기
  socket.on('close', () => {
    option.remove()
    logEngine(`socket ${socket.label} closed`)

    const view = messages.get(socket)
    view.textContent = '소켓이 닫혔습니다.'
    messages.delete(socket)
  })
}

// add 버튼 클릭 시 소켓 추가하기
addBtn.addEventListener('click', async () => {
  let id = socketIDInput.value

  if (id.length === 0) {
    id = undefined
    logEngine(('opening unnegotiated socket'))
  } else {
    logEngine(`opening socket ${id}`)
  }

  addBtn.disabled = true
  closeSocketBtn.disabled = true
  socketIDInput.disabled = true

  const socket = await engine.socket(id)
  addSocketEntry(socket)
  logEngine(`opened socket ${socket.label}`)

  socketIDInput.disabled = false
  addBtn.disabled = false
  closeSocketBtn.disabled = false
  socketIDInput.value = ''
})

// close 버튼 클릭 시 선택된 소켓 닫기
closeSocketBtn.addEventListener('click', () => {
  const selectedOption = socketList.options[socketList.selectedIndex]
  if (selectedOption === undefined) return

  const socket = selectedOption[socketSymbol]

  socket.close()
})

// 소켓 선택 시 선택된 소켓의 정보를 아래 섹션에 보여주기
socketList.addEventListener('change', () => {
  const selectedOption = socketList.options[socketList.selectedIndex]
  showSocketDetail(selectedOption)
})

// 상대가 생성한 unnegotiated socket 표시하기
async function showUnnegotiatedSockets () {
  for await (const socket of engine.sockets()) {
    addSocketEntry(socket)
  }
}
showUnnegotiatedSockets()
