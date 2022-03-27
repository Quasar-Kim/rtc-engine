import RTCEngine from '../../../js/RTCEngine.js'
import { observe } from '../../../js/util/ObservableEntry.js'
import once from '../../../js/util/once.js'
import './PuppeteerSignaler.js'

async function main () {
  // 엔진 생성
  const engine = new RTCEngine(window.signaler, { autoConnect: false })

  // 연결 상태 바뀌면 state:${state} 이벤트 발생
  observe(engine.connection).onChange(state => {
    window.eventChannel.sendEvent(`state:${state}`)
  })

  // connect -> 연결하기
  await once(window.eventChannel, 'connect')
  engine.connect()

  await once(window.eventChannel, 'create-channel')
  const channel = await engine.channel('test-channel')
  window.eventChannel.sendEvent('channel-created')

  // 채널 제어
  channel.on('message', msg => window.eventChannel.sendEvent('channel-message', msg))
  window.eventChannel.on('send-message', msg => channel.send(msg))

  // close -> 닫기
  await once(window.eventChannel, 'close')
  engine.close()
}

main()
