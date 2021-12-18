// 아직은 web worker에서 import map이 지원되지 않습니다
import * as Comlink from 'https://ga.jspm.io/npm:comlink@4.3.1/dist/umd/comlink.js'
import {
  scanImage,
  createZbar
} from 'https://ga.jspm.io/npm:zbar-wasi@1.0.10/dist/zbar-wasi.esm.js'

async function init () {
  await createZbar({ wasmpath: './zbar.wasm' })
}

async function detectQR (imageData) {
  const result = await scanImage(imageData)
  return result
}

Comlink.expose({ init, detectQR }, self)
