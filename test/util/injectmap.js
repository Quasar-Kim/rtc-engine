// https://generator.jspm.io/#HY5LDsIwDES9YMVdYjVpi8QuV0lTAya/kliVegDODVGXM09PM98LwPUHVbyi/ORMKriaHPiXYzvhiBP4kiLncCYND46kmtupWoMDzsDrogIdu4v21osR3q1kVTevOrcDGtR3SCxix44H2CqJHGo5hJqdsTvwqb6sZDXOPTROW58gcadgoBUfSJCL8pEpSz+i0fwBaOJx7rkA

const map = `
{
  "imports": {
    "chai": "https://ga.jspm.io/npm:chai@4.3.4/index.mjs",
    "comlink": "https://ga.jspm.io/npm:comlink@4.3.1/dist/umd/comlink.js",
    "file-saver": "https://ga.jspm.io/npm:file-saver@2.0.5/dist/FileSaver.min.js",
    "idb-keyval": "https://ga.jspm.io/npm:idb-keyval@6.0.3/dist/index.js",
    "json-rpc-2.0": "https://ga.jspm.io/npm:json-rpc-2.0@0.2.19/dist/dev.index.js",
    "mitt": "https://ga.jspm.io/npm:mitt@3.0.0/dist/mitt.mjs",
    "pretty-bytes": "https://ga.jspm.io/npm:pretty-bytes@5.6.0/index.js",
    "qrcode": "https://ga.jspm.io/npm:qrcode@1.5.0/lib/browser.js",
    "simple-eta": "https://ga.jspm.io/npm:simple-eta@3.0.2/index.js",
    "socket.io-client": "https://ga.jspm.io/npm:socket.io-client@4.1.2/wrapper.mjs"
  },
  "scopes": {
    "https://ga.jspm.io/": {
      "assertion-error": "https://ga.jspm.io/npm:assertion-error@1.1.0/index.js",
      "backo2": "https://ga.jspm.io/npm:backo2@1.0.2/index.js",
      "base64-arraybuffer": "https://ga.jspm.io/npm:base64-arraybuffer@0.1.4/lib/base64-arraybuffer.js",
      "buffer": "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.13/nodelibs/browser/buffer.js",
      "check-error": "https://ga.jspm.io/npm:check-error@1.0.2/index.js",
      "component-emitter": "https://ga.jspm.io/npm:component-emitter@1.3.0/index.js",
      "debug": "https://ga.jspm.io/npm:debug@4.3.3/src/browser.js",
      "deep-eql": "https://ga.jspm.io/npm:deep-eql@3.0.1/index.js",
      "dijkstrajs": "https://ga.jspm.io/npm:dijkstrajs@1.0.2/dijkstra.js",
      "encode-utf8": "https://ga.jspm.io/npm:encode-utf8@1.0.3/index.js",
      "engine.io-client": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/index.js",
      "engine.io-client/contrib/xmlhttprequest-ssl/XMLHttpRequest.js": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/xmlhttprequest.js",
      "engine.io-client/lib/globalThis.js": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/globalThis.browser.js",
      "engine.io-client/lib/transports/websocket-constructor.js": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/transports/websocket-constructor.browser.js",
      "engine.io-parser": "https://ga.jspm.io/npm:engine.io-parser@4.0.3/lib/index.js",
      "engine.io-parser/lib/decodePacket.js": "https://ga.jspm.io/npm:engine.io-parser@4.0.3/lib/decodePacket.browser.js",
      "engine.io-parser/lib/encodePacket.js": "https://ga.jspm.io/npm:engine.io-parser@4.0.3/lib/encodePacket.browser.js",
      "get-func-name": "https://ga.jspm.io/npm:get-func-name@2.0.0/index.js",
      "has-cors": "https://ga.jspm.io/npm:has-cors@1.1.0/index.js",
      "ms": "https://ga.jspm.io/npm:ms@2.1.2/index.js",
      "parseqs": "https://ga.jspm.io/npm:parseqs@0.0.6/index.js",
      "parseuri": "https://ga.jspm.io/npm:parseuri@0.0.6/index.js",
      "pathval": "https://ga.jspm.io/npm:pathval@1.1.1/index.js",
      "process": "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.13/nodelibs/browser/process.js",
      "safari-14-idb-fix": "https://ga.jspm.io/npm:safari-14-idb-fix@3.0.0/dist/index.js",
      "socket.io-parser": "https://ga.jspm.io/npm:socket.io-parser@4.0.3/dist/index.js",
      "type-detect": "https://ga.jspm.io/npm:type-detect@4.0.8/type-detect.js",
      "yeast": "https://ga.jspm.io/npm:yeast@0.1.2/index.js"
    }
  }
}
`

const mapElem = document.createElement('script')
mapElem.setAttribute('type', 'importmap')
mapElem.innerHTML = map
document.head.append(mapElem)
