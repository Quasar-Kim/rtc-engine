# RTCEngine v0.3

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

WebRTC를 이용한 __데이터 전송__ 을 위한 라이브러리입니다. 

비디오와 오디오 전송을 주요 기능으로 하는 다른 라이브러리와 다르게 텍스트와 파일을 쉽게 전송하고 받을 수 있도록 하는걸 목표로 합니다.

# 기능
- 마음대로 구현할 수 있는 시그널러
- 자동으로 연결하고 재연결함
- 한줄로 끝나는 새 채널 열기
- 데이터 채널의 버퍼 자동 관리
- WHATWG Stream을 이용해 대용량 파일 전송도 가능

# 설치
npm을 사용한다면: 
```
npm install rtc-engine
```

브라우저에서 바로 사용하고 싶다면:
```javascript
// 파일이 로드될때 type="module"이어야 합니다
import RTCEngine from 'https://jspm.dev/rtc-engine'
```

# 예시: 채널 사용하기

```javascript
// 아무 시그널러나 생성(구현은 자유...)
// 또는 SocketSignaler를 사용할수도 있습니다(언젠가 내용 작성 예정)
const signaler = new Signaler()

// 시그널러 설정...

// 1. 엔진 객체 생성
// 생성시 자동 연결
const engine = new RTCEngine(signaler)

// 2. 채널 열기
// 상대방도 아래와 똑같은 코드를 실행하면 channel이 생성됨
const channel = await engine.channel('messaging')

// 3. 메시지 보내기
channel.send('hello RTCEngine!')
```

# 예시: 파일 보내기
```javascript
// 전송하는 쪽
const file = /* 어떻게 파일 받기 */
const transaction = await engine.writable('whateverIdentifierYouWant')
file.stream().pipeTo(transaction.stream)

// 받는 쪽
const destination = /* 파일의 데이터를 스트림할 WritableStream. StreamSaver.js같은거 사용 가능 */
const transaction = await engine.readable('whatEverIdentifierYouWant')
transaction.stream.pipeTo(destination)
```

# exports

```javascript
import RTCEngine, { wait, waitAll, observe, SignalerBase, SocketSignaler } from 'rtc-engine'
```
 - `default`: RTCEngine 객체
 - `wait`, `waitAll`, `observe`: ObservableClass 함수들
 - `SignalerBase`: 시그널러가 확장해야 하는 클래스
 - `QRSignaler`: QR코드를 이용한 시그널러
 - `SocketSignaler`

# API

## RTCSocket

Channel과 Transaction의 기반이 되는 베이스 클래스. 다음과 같은 일을 처리함.

- 메시지 버퍼링: 실제 데이터 채널이 닫혀 있어도 write()시 에러가 나지 않도록
- 오브젝트 전송 지원: 보낼 메시지가 오브젝트인 경우 자동으로 JSON 전송
- 이벤트 이미터 지원: 오브젝트가 아래 형식일 경우 이벤트 이미팅 가능

```jsx
{
  _channelEngineCustomEvent: true
	event: 'event_name'
	payload: {} // 아무 데이터나 가능 
}
```

## Channel

데이터 채널과 비슷한 역할을 함.
- 메시지를 주고 받을 수 있음. `send()`로 보내고, `message` 이벤트로 받을 수 있음.
- 문자열, ArrayBuffer, File을 전송 가능.

```jsx
// 보내는 측
const channel = await engine.channel('label')
channel.send('string')
channel.send({ name: 'red' })

// 받는 측
const fileSaver = new FileSaver()
const channel = await engine.channel('label')
channel.on('message', msg => console.log(msg))
```

## Transaction

단방향 데이터 전송을 나타내는 객체.

- 새로운 데이터채널을 열고 데이터 전송
- 파일 이름, 사이즈 등 메타데이터 자동 전송
- 자동 청킹
- ETA, 전송 속도, 퍼센티지 제공

```jsx
// 보내기
let file

// 파일 입력 받음

const transaction = await engine.writable('myFile', {
    // 메타데이터, 아무 데이터나 보낼 수 있음
    name: file.name,
    size: file.size
})

file.stream().pipeTo(transaction.stream)


// 받기
let destination

// destination을 어떻게 만들었다 치고...

const transaction = await engine.readable('myFile')
transaction.stream.pipeTo(destination)

// 메타데이터 읽기도 가능
transaction.metadata
```

전송 일시정지/재개/중단도 가능
```jsx
transaction.resume()
transaction.pause()
transaction.stop()
```

채널의 `send()` 메소드를 파일과 함께 호출하면 자동으로 transaction이 만들어짐. 리턴된 transaction을 이용하면 위와 같이 전송 컨트롤도 가능.

```javascript
const transaction = await channel.send(file)
```

## QRSignaler
QR코드를 이용한 시그널러. 카메라가 있는 두 기기를 시그널러가 시작된 후 서로 마주보게 놓으면 QR코드를 이용해 통신합니다.

인터넷을 사용할 수 없을때 한 기기가 핫스팟을 실행하고 다른 기기가 그 네트워크에 연결한 후 QR 시그널러를 통해서 연결을 형성할 수 있습니다.

예시 코드는 [라이브 데모](https://stackblitz.com/edit/js-uqdabg)를 참조하세요.

```javascript
import RTCEngine, { QRSignaler } from 'rtc-engine'

const signaler = new QRSignaler(/* 적절한 옵션 */)
const engine = new RTCEngine(signaler)

const channel = await engine.channel('chat')
console.log('채널 만들어짐')
```
