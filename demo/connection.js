import RTCEngine from '../../js/RTCEngine.js'
import { observe } from '../../js/util/index.js'
import LocalSignaler from '../../js/signaler/LocalSignaler.js'
import beautifyJSON from 'https://jspm.dev/json-beautify'

// -------------------
// ice server list
const addBtn = document.querySelector('#add')
const removeBtn = document.querySelector('#remove')
const resetBtn = document.querySelector('#reset')
const serversList = document.querySelector('#servers')
const urlInput = document.querySelector('#url')
const usernameInput = document.querySelector('#username')
const passwordInput = document.querySelector('#password')

// add 버튼 클릭 시 ice server 엔트리 추가하기
addBtn.addEventListener('click', () => {
  if (urlInput.value.length === 0) return

  // iceServer 만들기
  const iceServer = {
    urls: [urlInput.value]
  }

  if (usernameInput.value.length > 0) {
    iceServer.username = usernameInput.value
  }

  if (passwordInput.value.length > 0) {
    iceServer.credential = passwordInput.value
  }

  // 추가하기
  const option = document.createElement('option')
  option.value = JSON.stringify(iceServer)
  option.textContent = iceServer.urls[0]
  serversList.appendChild(option)

  // 필드 클리어
  urlInput.value = ''
  usernameInput.value = ''
  passwordInput.value = ''
})

// remove 버튼 클릭 시 serversList에서 선택된 option 삭제
removeBtn.addEventListener('click', () => {
  const selectedOption = serversList.options[serversList.selectedIndex]
  if (selectedOption === undefined) return

  selectedOption.remove()
})

// reset 버튼 클릭 시 ice servers 엔트리 초기화
resetBtn.addEventListener('click', () => {
  serversList.innerHTML = '<option value="{&quot;urls&quot;:[&quot;stun:stun.l.google.com:19302&quot;]}">stun:stun.l.google.com:19302</option>'
})

function getIceServers () {
  const servers = []
  for (const elem of serversList.children) {
    servers.push(JSON.parse(elem.value))
  }

  return servers
}

// -------------------
// config
const waitOnlineOnReconnectionCheckBox = document.querySelector('#waitOnlineOnReconnection')
const roleRadioBoxContainer = document.querySelector('#role')

function getConfig () {
  const config = {
    iceServers: getIceServers(),
    waitOnlineOnReconnection: waitOnlineOnReconnectionCheckBox.checked
  }

  const role = roleRadioBoxContainer.querySelector('input:checked').value
  if (role !== 'auto') {
    config.role = role
  }

  return config
}

// -------------------
// logging
const engineLogList = document.querySelector('#engineLog')
const signalerLogList = document.querySelector('#signalerLog')

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
}

function logSignaler (msg, direction) {
  const time = (new Date()).toLocaleTimeString('en-US', { hour12: false })

  if (direction === 'outgoing') {
    const log = `⬆ [${time}] ${msg}`
    const logEntry = createLogEntry(log)
    logEntry.className = 'outgoing-msg'
    signalerLogList.appendChild(logEntry)
  } else if (direction === 'incoming') {
    const log = `⬇ [${time}] ${msg}`
    const logEntry = createLogEntry(log)
    logEntry.className = 'incoming-msg'
    signalerLogList.appendChild(logEntry)
  }
}

// -------------------
// signaler setup
const signaler = new LocalSignaler()

// 들어오는 시그널 로그하기
signaler.on('incoming-msg', msg => {
  logSignaler(msg, 'incoming')
})

// 나가는 시그널 로그하기
signaler.on('outgoing-msg', msg => {
  logSignaler(msg, 'outgoing')
})

// -------------------
// engine
const connectBtn = document.querySelector('#connect')
const closeBtn = document.querySelector('#close')
const stateText = document.querySelector('#state')
const configTextView = document.querySelector('#configText')

async function initEngine () {
  const config = getConfig()
  const configText = beautifyJSON(config, null, 2, 50)
  configTextView.textContent = configText

  const engine = new RTCEngine(signaler, config)
  logEngine('engine started')

  closeBtn.disabled = false

  // connect 버튼 누르면 connect() 메소드 부르기
  connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true

    try {
      await engine.connect()
    } finally {
      connectBtn.disabled = false
    }
  })

  // close 버튼 누르면 연결 닫기
  closeBtn.addEventListener('click', () => {
    connectBtn.disabled = true
    closeBtn.disabled = true
    engine.close()
  })

  // 연결 상태 보여주기
  observe(engine.connection).toBeChanged().then(connection => {
    logEngine(`connection state: ${connection}`)

    if (connection === 'closed') {
      logEngine('connection closed')
      stateText.textContent = '연결이 닫혔습니다. 새로운 연결을 시작하려면 페이지를 새로고침하세요.'
      return
    }

    stateText.textContent = `connection state: ${connection}`
  })

  // 연결이 끊어진 상태(disconnected, failed)인 경우 connect 버튼 활성화
  observe(engine.connection).toBeChanged().then(c => {
    if (c === 'disconnected' || c === 'failed') {
      connectBtn.disabled = false
    } else {
      connectBtn.disabled = true
    }
  })
}

// connect 버튼 누르면 initEngine 호출
connectBtn.addEventListener('click', async () => {
  initEngine()
}, { once: true })
