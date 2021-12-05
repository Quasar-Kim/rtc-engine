import { SocketSignaler } from '../../js/index.js'
import RPCClient from '../../js/signaler/RPCClient.js'
import once from '../../js/util/once.js'

describe('socket.io signaler', () => {
  it('createSessionCode() - 세션 코드 만들어서 리턴', async function () {
    const socketSignaler = new SocketSignaler()
    const sessionCode = await socketSignaler.createSessionCode()
    expect(sessionCode.length).to.equal(4)
  })

  it('connect() - 세션 코드를 이용해 상대의 session ID를 가져오기', async function () {
    const remoteClient = new RPCClient(process.env.SERVER)
    const sessionID = await once(remoteClient, 'session')
    const sessionCode = await remoteClient.createSessionCode()

    const signaler = new SocketSignaler()
    await signaler.connect(sessionCode)
    expect(signaler.remoteSessionID).to.equal(sessionID)
  })

  it('waitForConnection() - 상대가 connect()로 연결할때까지 대기', async function () {
    const signaler = new SocketSignaler()
    const sessionCode = await signaler.createSessionCode()

    const remoteSignaler = new SocketSignaler()
    const remoteSessionID = await once(remoteSignaler.rpcClient, 'session')
    remoteSignaler.connect(sessionCode)

    await signaler.waitForConnection()
    expect(signaler.remoteSessionID).to.equal(remoteSessionID)
  })

  it('send() - 시그널링 메시지 전송', async function () {
    const signaler = new SocketSignaler()
    const sessionCode = await signaler.createSessionCode()

    const remoteSignaler = new SocketSignaler()
    remoteSignaler.connect(sessionCode).then(() => {
      signaler.send({ key: 'value' })
    })

    await signaler.waitForConnection()

    // eslint-disable-next-line no-unreachable-loop
    for await (const msg of remoteSignaler.messages()) {
      expect(msg).to.deep.equal({ key: 'value' })
      break
    }
  })

  it('close() - 내부 RPCClient 닫고 속성 초기화', function () {
    const signaler = new SocketSignaler()
    signaler.close()
    expect(signaler.rpcClient.socket.disconnected).to.equal(true)
    // eslint-disable-next-line no-unused-expressions
    expect(signaler.remoteSessionID).to.be.undefined
  })

  it('접속 후 turn 이벤트 발생 시 turn config를 this.turn 프라미스를 통해 전달', async function () {
    const signaler = new SocketSignaler()
    const turn = await signaler.state.wait('turn').toBeDefined()
    expect(turn).to.deep.equal({
      urls: ['turn:example.com'],
      username: 'example@example.com',
      credential: 'credential'
    })
  })

  it('waitForSessionReconnection() - 상대방이 재접속될때까지 대기', async function () {
    // 일반적으로 접속
    const signaler = new SocketSignaler()
    const sessionCode = await signaler.createSessionCode()

    const remoteSignaler = new SocketSignaler()
    remoteSignaler.connect(sessionCode)

    await signaler.waitForConnection()

    // remoteSignaler가 재접속
    remoteSignaler.rpcClient.socket.disconnect()
    setTimeout(() => {
      remoteSignaler.rpcClient.socket.connect()
    })

    await signaler.waitForSessionReconnection()
  })
})

afterEach(() => {
  sessionStorage.clear()
})
