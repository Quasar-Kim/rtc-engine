# RTCEngine v0.1

WebRTC 라이브러리. socket.io처럼 내부 로직을 최대한 숨기는걸 목표로 함.

# 설치
```
npm install rtc-engine
```

# 채널 사용하기

```javascript
// 아무 시그널러나 생성(구현은 자유...)
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
- 메시지는 `JSON.stringify()`로 처리할 수 있는 데이터면 모두 가능
- `emit()`와 `on()`을 이용해 socket.io처럼 이벤트를 이용한 통신도 가능 

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

- 새로운 데이터채널 열고 데이터 전송
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