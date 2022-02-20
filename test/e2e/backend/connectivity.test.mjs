import puppeteer from 'puppeteer'
import http from 'http'
import handler from 'serve-handler'
import { once } from 'events'
import EventChannel from './EventChannel.mjs'

async function createInstance (browser) {
  // 페이지 설정
  const page = await browser.newPage()
  await page.goto('http://localhost:8000/test/e2e/frontend/connectivity.html')

  // 이벤트 채널 설정
  const eventChannel = new EventChannel(page)
  await eventChannel.init()

  return {
    page,
    eventChannel
  }
}

describe('RTCEngine', function () {
  before(async function () {
    // 서버 시작
    const server = http.createServer((req, res) => handler(req, res))
    await new Promise(resolve => server.listen(8000, resolve))

    // 브라우저 켜기
    this.browser = await puppeteer.launch({ headless: false })
    // const browser = await puppeteer.launch()

    this.instanceA = await createInstance(this.browser)
    this.instanceB = await createInstance(this.browser)

    // 서로에게 메시지를 넘겨주도록 설정
    this.instanceA.eventChannel.on('relay', payload => this.instanceB.eventChannel.sendEvent('relay', payload))
    this.instanceB.eventChannel.on('relay', payload => this.instanceA.eventChannel.sendEvent('relay', payload))
  })

  it('연결하기', async function () {
    await this.instanceA.eventChannel.sendEvent('connect')
    await this.instanceB.eventChannel.sendEvent('connect')
    await Promise.all([
      once(this.instanceA.eventChannel, 'state:connected'),
      once(this.instanceB.eventChannel, 'state:connected')
    ])
  })

  it('채널 생성', async function () {
    await Promise.all([
      this.instanceA.eventChannel.sendEvent('create-channel'),
      this.instanceB.eventChannel.sendEvent('create-channel'),
      once(this.instanceA.eventChannel, 'channel-created'),
      once(this.instanceB.eventChannel, 'channel-created')
    ])
  })

  it('채널로 메시지 보내기', function (done) {
    this.instanceB.eventChannel.on('channel-message', msg => {
      if (msg !== 'hello from instance A') throw new Error('message does not match')
      done()
    })
    this.instanceA.eventChannel.sendEvent('send-message', 'hello from instance A')
  })

  it('닫기', function (done) {
    let aClosed = false
    let bClosed = false

    this.instanceA.page.on('console', msg => {
      if (!msg.text().includes('연결 닫힘')) return
      aClosed = true

      if (aClosed && bClosed) {
        done()
      }
    })

    this.instanceB.page.on('console', msg => {
      if (!msg.text().includes('연결 닫힘')) return
      bClosed = true

      if (aClosed && bClosed) {
        done()
      }
    })

    this.instanceA.eventChannel.sendEvent('close')
  })
})
