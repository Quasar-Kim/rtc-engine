// https://generator.jspm.io/#HcxBDsIgEIXhWZh4GgilauKOqwAdzVgKDTMh6cqV93bS7f++vN8F4Prtkg3WN1WEFxU0HAf24K2zd6AlmRWPEUt4aJjhw62avmeje3DW2+kJG4mEWWcHLTH2EZPe5BKZlUyambZdE0o8nQdueUWx1JQRVgk3df4Phe8z7pAA

const map = `
{
  "imports": {
    "file-saver": "https://ga.jspm.io/npm:file-saver@2.0.5/dist/FileSaver.min.js",
    "idb-keyval": "https://ga.jspm.io/npm:idb-keyval@6.0.3/dist/index.js",
    "json-rpc-2.0": "https://ga.jspm.io/npm:json-rpc-2.0@0.2.19/dist/dev.index.js",
    "mitt": "https://ga.jspm.io/npm:mitt@3.0.0/dist/mitt.mjs",
    "observable-class": "https://ga.jspm.io/npm:observable-class@0.1.0/ObservableClass.js",
    "simple-eta": "https://ga.jspm.io/npm:simple-eta@3.0.2/index.js",
    "socket.io-client": "https://ga.jspm.io/npm:socket.io-client@4.1.2/wrapper.mjs"
  },
  "scopes": {
    "https://ga.jspm.io/": {
      "backo2": "https://ga.jspm.io/npm:backo2@1.0.2/index.js",
      "base64-arraybuffer": "https://ga.jspm.io/npm:base64-arraybuffer@0.1.4/lib/base64-arraybuffer.js",
      "buffer": "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/buffer.js",
      "component-emitter": "https://ga.jspm.io/npm:component-emitter@1.3.0/index.js",
      "debug": "https://ga.jspm.io/npm:debug@4.3.2/src/browser.js",
      "engine.io-client": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/index.js",
      "engine.io-client/contrib/xmlhttprequest-ssl/XMLHttpRequest.js": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/xmlhttprequest.js",
      "engine.io-client/lib/globalThis.js": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/globalThis.browser.js",
      "engine.io-client/lib/transports/websocket-constructor.js": "https://ga.jspm.io/npm:engine.io-client@5.1.2/lib/transports/websocket-constructor.browser.js",
      "engine.io-parser": "https://ga.jspm.io/npm:engine.io-parser@4.0.3/lib/index.js",
      "engine.io-parser/lib/decodePacket.js": "https://ga.jspm.io/npm:engine.io-parser@4.0.3/lib/decodePacket.browser.js",
      "engine.io-parser/lib/encodePacket.js": "https://ga.jspm.io/npm:engine.io-parser@4.0.3/lib/encodePacket.browser.js",
      "has-cors": "https://ga.jspm.io/npm:has-cors@1.1.0/index.js",
      "ms": "https://ga.jspm.io/npm:ms@2.1.2/index.js",
      "parseqs": "https://ga.jspm.io/npm:parseqs@0.0.6/index.js",
      "parseuri": "https://ga.jspm.io/npm:parseuri@0.0.6/index.js",
      "process": "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.12/nodelibs/browser/process.js",
      "safari-14-idb-fix": "https://ga.jspm.io/npm:safari-14-idb-fix@3.0.0/dist/index.js",
      "socket.io-parser": "https://ga.jspm.io/npm:socket.io-parser@4.0.3/dist/index.js",
      "yeast": "https://ga.jspm.io/npm:yeast@0.1.2/index.js"
    }
  }
}
`

const mapElem = document.createElement('script')
mapElem.setAttribute('type', 'importmap')
mapElem.innerHTML = map
document.body.append(mapElem)

