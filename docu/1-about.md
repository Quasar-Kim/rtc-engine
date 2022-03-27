---
title: about
tags: doc
layout: doc.njk
---

RTCEngine은 webrtc 기술을 이용해 데이터를 전송하기 위해서 만든 라이브러리입니다. 기존 webrtc api는 너무 코드량이 많고 귀찮아서 이걸 좀 쓰기쉽게 나름대로 재포장해본 결과가 이 라이브러리입니다.

좀 더 자세히 말하면 webrtc의 datachannel 기능을 이용하면 파일을 전송할 수 있지 않을까란 생각을 했고 실험을 해봤는데 가능은 하나 너무 고려해야 될 부분이 많았습니다. 그래서 그걸 알아서 관리해주는 라이브러리로 구현한게 이겁니다. 따라서 이 라이브러리는 파일 전송에 특화된 기능들이 중심적으로 구현되어 있습니다.

현재 구현된 기능들은 다음과 같습니다.

- RTCSocket: RTCDataChannel을 감싸는 객체.
  * 버퍼 관리: 데이터 채널(RTCDataChannel)은 버퍼에 들어온 데이터가 버퍼의 크기를 넘겨버리면 에러가 뜨면서 닫혀버립니다. RTCSocket은 데이터를 전송할 때 버퍼가 터지지 않도록 자동으로 관리합니다.
  * EventEmitter 기능: 기본적인 EventEmitter 기능들이 구현되어 있습니다. 그냥 메시지를 주고받는것 보다 코드짜는데 골이 덜 때립니다.
- Transaction: 단방향 데이터 전송을 위해 사용되는 객체.
  * WHATWG stream을 이용한 데이터 전송: 데이터 채널을 이용해서 파일을 보내려면 고려해야 할 게 꽤 많습니다. 하지만 Transaction은 `ReadableStream`, `WritableStream`을 이용한 데이터 I/O를 지원해서 스트림을 냅다 가져다 꽃기만 해도 알아서 데이터를 전송합니다.
  * 플로우 컨트롤: 일시정지와 재개, 완전-정지 모두 가능합니다.
  * 메타데이터 전송: Transaction 생성 시 추가로 아무 데이터나 같이 보낼 수 있습니다.
  * 데이터 레포팅: Transaction은 `report` 이벤트로 1초마다 속도, 전송 퍼센티지, ETA(남은 예상 시간)등의 정보를 제공합니다.
- Channel: RTCSocket의 api를 RTCDataChannel에 가깝게 좀 더 다듬은것. RTCSocket과 기능상 거의 차이가 없습니다.

RTCEngine은 아직 불안정하빈다. 중요한데는 [PeerJS](https://peerjs.com) 쓰세요.