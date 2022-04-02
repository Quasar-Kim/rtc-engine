---
title: RTCEngine 객체
tags: doc
layout: doc.njk
---

## 생성하기
불러온 RTCEngine의 인스턴스를 생성하면 연결이 자동으로 시작됩니다. 문제는 두 피어가 연결을 하려면 어떤 방식으로든 메시지를 주고받아야 하고, 메시지를 주고 받는 건 WebRTC API가 우리한테 알아서 하도록 하고 있다는겁니다. 이 메시징을 도와주는 객체가 바로 __시그널러__ 입니다. 시그널러는 미리 구현된 걸 사용할수도 있고, 직접 구현하셔도 됩니다.

여기서는 두 탭 간에 BroadcastChannel을 이용해서 소통하는 LocalSignaler를 사용하겠습니다. 

```javascript
// import 문의 내용을 아래처럼 업데이트해주세요.
import RTCEngine, { LocalSignaler } from 'rtc-engine'

const signaler = new LocalSignaler()
const engine = new RTCEngine(signaler)
```

## 연결하기
RTCEngine 인스턴스는 생성될 때 특별히 옵션을 넣어주지 않으면 바로 연결을 시작합니다. 위 예제 코드를 두 탭에서 열고 브라우저 코드를 확인해보세요. 자동으로 연결되어 있을 겁니다.

이제 RTCEngine이 연결하기까지 어떤 과정을 거치는지 알아봅시다.

### 0. 시그널러 설정
RTCEngine이 연결을 하려면 시그널러가 메시지를 보낼 준비가 되어야 합니다. 이 과정은 시그널러가 RTCEngine과 독립적으로 처리해야 합니다.
그런데 위 예시 코드에서는 시그널러가 설정되었는지 확인도 하지 않고 바로 RTCEngine을 생성하고, 연결 과정이 시작됩니다. 이러면 시그널러 설정이 완료되지 않아서 문제가 발생하지 않을까요?

당연히 그렇진 않습니다. 시그널러는 `signaler.ready` 속성을 통해서 통신할 수 있는 상태인지를 나타냅니다. RTCEngine은 시그널러를 이용하기 전에 항상 이 속성이 `true` 값을 가지는지 체크하고 `false`라면 `true`가 될때까지 대기합니다. 따라서 시그널러는 시그널러대로 코드를 실행할 수 있습니다.

위 예시에서 사용한 LocalSignaler는 탭 간 통신 창구인 `BroadcastChannel`을 생성하고, 주기적으로 heartbeat 신호를 발생시킵니다. 상대에게서 온 heartbeat 신호를 수신하면 이는 연결되었다는 뜻으로 받아들이고 `ready` 속성을 `true`로 설정합니다. 그리고 heartbeat 신호가 좀 길게 수신되지 않는다면(대략 2초정도) 상대가 나간걸로 판단합니다. 따라서 `ready`속성이 `false`로 바뀝니다. 그렇기 때문에 두 창에서 위 코드를 실행시키면 LocalSignaler는 통신이 가능한 상태라고 판단하는 것입니다.

### 1. role 정하기
RTCEngine은 WebRTC Spec에서 제시하는 Perfect Negotiation Pattern을 이용해서 RTC 연결을 형성합니다. 이 패턴의 장점은 양 피어의 코드가 대칭적으로 짜여진다는 것입니다. 이 패턴을 활용하려면 서로의 role이 impolite 또는 polite로 배정되어야 합니다. 이 과정은 `Math.random()`으로 생성한 난수를 서로 교환함으로써 이루어집니다. 실제 RTCEngine 코드의 `assignRole()` 메소드를 보면 상대의 난수보다 내 난수가 작으면 내가 polite, 그 반대의 경우 내가 impolite역할이 됩니다.

### 2. offer/answer과 ice candidate 교환
(좀 더 자세한 설명은 mdn의 [WebRTC Connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity) 문서를 읽어보세요.)
RTC 연결이 이루어지려면 두 피어간 아래 정보가 교환되어야 합니다.

 - offer과 answer: 서로의 미디어에 대한 정보를 포함하고 있는 메시지.
 - ice candidate: 서로의 네트워크 환경에 대한 정보를 포함하고 있는 메시지.

이 두가지 메시지는 시그널러를 통해서 서로에게 전달됩니다. RTCEngine은 받은 offer/answer, ice candidate를 perfect negotiation pattern에 따라서 처리합니다. 모든게 정상적으로 처리된다면 메시지를 주고받은 후 두 피어 사이에 연결이 형성되게 됩니다.

### 3. ice restart
어느 한쪽의 인터넷이 잠시 끊긴다거나 하는 여러가지 이유로 RTC 연결은 언제나 끊길 수 있습니다. 연결이 끊긴 지 약 5초 후(정확히는 RTCPeerConnection의 readyState가 failed가 되었을 때)에도 연결이 정상화되지 않는다면 ice restart가 자동으로 이루어집니다. 그러면 2번 과정이 다시 이루어지게 되고 연결이 다시 형성될 수도 있습니다.

## 소켓 생성하기
RTCEngine의 `socket()` 메소드를 호출하면 소켓을 생성할 수 있습니다. 소켓은 양방향 통신을 위한 객체로 이걸 통해서 메시지를 주고받을 수 있습니다.

위 예시 코드를 아래처럼 바꿔주세요.
```javascript
import RTCEngine, { LocalSignaler } from 'rtc-engine'

const signaler = new LocalSignaler()
const engine = new RTCEngine(signaler)

// hello는 소켓을 서로 구별하기 위한 ID. 양쪽에서 모두 동일한 ID로 소켓 생성을 요청하면 소켓이 만들어집니다.
engine.socket('hello').then(socket => {
  // 소켓에서 뭔가 받으면 콘솔에 찍기
  socket.on('data', data => console.log('Received: ', data))

  // 인사 메시지 보내보기
  socket.write('hello RTCEngine')
})
```

위 코드에서 가장 큰 특징은 RTC 연결이 형성되었는지 기다리지 않고 바로 소켓을 생성한다는 겁니다. RTCEngine은 socket.io의 영향을 받아 대부분의 작업이 연결 상태에 영향을 받지 않습니다. 위 코드에서 socket()이 호출되면 내부적으로는 연결이 형성될때까지 기다렸다가 데이터 채널이 만들어지고, 이 데이터 채널을 기반으로 소켓이 만들어집니다. 이렇게 만들어진 소켓은 promise 형태로 resolve되어서 코드에서 사용될 수 있게 됩니다.