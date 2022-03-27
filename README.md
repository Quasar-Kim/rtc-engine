# RTCEngine

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

WebRTC를 이용한 __데이터 전송__ 을 위한 라이브러리입니다. 

비디오와 오디오 전송을 주요 기능으로 하는 다른 라이브러리와 다르게 텍스트와 파일을 쉽게 전송하고 받을 수 있도록 하는걸 목표로 합니다.

## 주의 사항
최소 ES2020을 지원하는 브라우저에서만 작동합니다.

## 주요 기능
- 마음대로 구현할 수 있는 시그널러
- 자동으로 연결하고 재연결
- 한줄로 끝나는 새 채널 열기
- 데이터 채널의 버퍼 자동 관리
- WHATWG Stream을 이용해 대용량 파일 전송도 가능

## 빠른 시작
먼저 index.html과 index.js를 만드세요.

```html
<!-- index.html -->
<script src="index.js" type="module"></script>
```

```javascript
// index.js
import RTCEngine, { LocalSignaler } from 'https://jspm.dev/rtc-engine@1'

// LocalSignaler는 두 탭 사이에서 연결을 형성하도록 도와줍니다.
const signaler = new LocalSignaler()
const engine = new RTCEngine(signaler)

// 메시지를 주고받을 수 있는 채널을 만듭니다.
engine.channel('hello').then(channel => {
  channel.on('message', msg => {
    console.log(msg)
  })
  channel.send('helloo RTCEngine!')
})
```

그다음 로컬 서버를 열어주세요.
```
npx serve
```

그리고 `localhost`로 가서 index.html을 서로 다른 두 탭에서 열고 브라우저 콘솔을 열어보세요.
서로 메시지를 주고 받은 모습을 볼 수 있을 겁니다.

## 더 알아보기
RTCEngine에 대해 더 자세히 알아보기 싶으면 [웹사이트](https://quasar-kim.github.io/rtc-engine)을 둘러보세요!

