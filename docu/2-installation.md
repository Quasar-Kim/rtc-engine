---
title: 설치하기
description: RTCEngine 라이브러리를 설치하고 불러오는 방법을 알아봅시다.
tags: doc
layout: doc.njk
---

## 빠른 가이드
RTCEngine을 사용하려면 먼저 라이브러리를 설치하거나 불러와야 합니다. **빠른 가이드**답게 빠르게 RTCEngine을 불러와 봅시다.

### 개발 환경 준비하기

이 가이드동안 쓸 디렉토리를 하나 만들어주세요.(저는 `rtc-engine-guide`라고 정했습니다) 그리고 거기에 `index.html`과 `index.js` 파일을 만들어주세요.

```diff
rtc-engine-guide
+   index.html
+   index.js
```

`index.html`에서 `index.js`를 불러옵시다.

```html
<!-- RTCEngine은 es module 형식으로만 불러올 수 있는 라이브러리입니다. type="module"을 빼지 마세요. -->
<script type="module" src="./index.js"></script>
```

이제 파일들을 브라우저에서 띄워봅시다. 다음 명령어로 `serve` 패키지를 설치하고 실행해주세요. (저는 간편한 `serve` 패키지를 애용하는데 좋아하시는 개발용 서버가 있다면 그걸 쓰서도 상관없어요.)
```
$ npm install serve -g
$ serve
```

명령어를 실행하면 로컬 서버 주소가 자동으로 클립보드로 복사됩니다. 브라우저를 열고 주소를 붙여넣어서 `index.html`을 열어주세요. 아무것도 안 뜨면 성공입니다.

### 불러오기
이제 `index.js`를 열고 라이브러리를 불러와봅시다. 아래 내용을 넣어주세요.

```javascript
import RTCEngine from 'https://jspm.dev/rtc-engine@1'

const engine = new RTCEngine(signaler)
```

저장하고 브라우저에서 `F5`키를 눌러서 새로고침한 후 개발자 도구의 브라우저 콘솔을 확인해주세요. `RTCEngine 인스턴스가 생성되었습니다`가 뜨면 제대로 된거에요.

### 저는 번들러를 쓸 줄 알아요
(번들러를 쓰지 않을거라면 이 섹션은 건너뛰세요.)

jspm.dev에서 불러오는 대신 NPM으로 설치할수도 있습니다. 

```
$ npm install rtc-engine@1
```

`index.js`의 내용은 그러면 이렇게 되겠죠.

```javascript
import RTCEngine from 'rtc-engine'

const engine = new RTCEngine(signaler)
```

## 디테일 가이드

[`rtc-engine`](https://npmjs.com/package/rtc-engine) 라이브러리는 NPM을 통해 패키지 형태로 배포됩니다. 패키지는 현재 es module 형식만 지원합니다.(즉 commonjs는 지원하지 않습니다.)

라이브러리를 불러오는 방법에는 크게 3가지가 있습니다.
1. npm과 번들러를 함께 사용하기
2. 일반적인 cdn 사용하기
3. 모듈 cdn과 함께 import map을 사용하기

아래에서 하나씩 다뤄보도록 하겠습니다.

### 방법 1. npm + 번들러
parcel, webpack같은 번들러를 사용할 경우 npm을 이용해 라이브러리를 불러 올 수 있습니다.
먼저 아래 명령어로 `rtc-engine` 패키지를 설치하세요.

```
$ npm install rtc-engine
```

그다음 자바스크립트 파일에서 다음 코드로 `RTCEngine` 객체를 불러오세요.
```javascript
import RTCEngine from 'rtc-engine'
```

마지막으로 번들러를 이용해 번들링하세요. 여기선 parcel을 사용해보겠습니다.
```
$ parcel index.html
```

### 방법 2. CDN
작은 프로토타입 프로젝트의 경우 번들러를 설정하는건 상당히 귀찮습니다. 이 경우 CDN을 사용해보세요.
```javascript
// jspm.dev
import RTCEngine from 'https://jspm.dev/rtc-engine@1'

// unpkg.com
import RTCEngine from 'https://unpkg.com/rtc-engine@1'
```

### 방법 3. CDN + import map
__주의사항__: import map 기능은 Chrome 89 이상에만 구현되어 있는 실험적인 기능입니다. Production에 사용하지 마세요.

cdn을 통해서 바로 불러오는게 확실히 번들러를 이용하는것보다 편합니다. 하지만 몇가지 문제가 있습니다.

1. visual studio code의 intellisense 자동완성 기능을 쓸 수 없습니다.
2. 코드가 살짝 더러워(?) 보입니다.

import map 기능을 이용하면 이 문제를 해결할 수 있습니다.

[jspm generator](generator.jspm.io)에서 왼쪽의 `Add Dependency`에 `rtc-engine`을 입력하고 엔터를 누르세요. 잠시후 우측에 html 코드가 뜨는데, 거기서 `<script type="importmap">` 태그의 내용만 복사해서 html 파일에 붙여넣으세요. html 파일의 내용이 아래와 같이 될겁니다.

__주의__ 자바스크립트 파일을 로드하기 전에 import map이 불러와져야 합니다.

```diff

  <!-- ...대충 html 내용들 -->

+  <script type="importmap">
+  {
+    "imports": {
+      "rtc-engine": "https://ga.jspm.io/npm:rtc-engine@1.0.0-alpha.2/js/RTCEngine.js"
+    }
+  }
+  </script>

  <!-- ...대충 html 내용들 -->
```

그러면 자바스크립트 파일에서 더이상 cdn의 url을 사용하지 않고도 `rtc-engine` 패키지를 불러올 수 있습니다.(2번문제 해결)
```javascript
import RTCEngine from 'rtc-engine'
```

이렇게 하고, 작업중인 디렉토리에 npm으로 `rtc-engine` 패키지를 추가로 설치해주면...?

```
$ npm install rtc-engine
```

이제 intellisense 기능이 정상적으로 작동할겁니다. (1번문제 해결)
