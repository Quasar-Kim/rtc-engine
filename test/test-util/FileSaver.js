import * as IndexedDB from 'idb-keyval'
import BlobSaver from 'file-saver'

async function asyncIteratorToArray (asyncIterator) {
  const arr = []
  for await (const item of asyncIterator) {
    arr.push(item)
  }
  return arr
}

// 이것보다 사이즈가 큰 파일이 오면 file system access api를 이용해 저장
const BLOB_SIZE_THRESHOLD = 1 * (1024 * 1024 * 1024) // 1GB

function splitExtension (fileNameWithExtension) {
  const lastIndexOfDot = fileNameWithExtension.lastIndexOf('.')
  return [fileNameWithExtension.slice(0, lastIndexOfDot), fileNameWithExtension.slice(lastIndexOfDot + 1)]
}

function debug (...args) {
  if (window?.process?.env?.NODE_ENV === 'production') return
  console.log('[FileSaver]', ...args)
}

export default class FileSaver {
  constructor () {
    this.saveDirHandle = undefined
  }

  // 전제: 디렉토리 핸들이 존재
  async open ({ name, size }) {
    if (size > BLOB_SIZE_THRESHOLD) {
      if (!this.saveDirHandle) {
        throw new Error('directory not picked')
      }

      // 파일 이름이 겹치면 create가 true여도 덮어씌어짐
      const fileName = await this.createUniqueFileName(name)
      const fileHandle = await this.saveDirHandle.getFileHandle(fileName, { create: true })
      return await fileHandle.createWritable()
    } else {
      const chunks = []
      return new WritableStream({
        write: chunk => {
          debug('청크 받음')
          chunks.push(chunk)
        },
        close: () => {
          debug('blob 생성중')
          const blob = new Blob(chunks)
          // blob의 사이즈 체크
          if (blob.size !== size) {
            throw new Error(`파일 사이즈가 일치하지 않음. 받은 데이터는 ${blob.size} 바이트, 실제 데이터는 ${size} 바이트`)
          }
          BlobSaver.saveAs(blob, name)
        }
        // abort시 아무것도 하지 않음
      })
    }
  }

  async promptDir () {
    this.saveDirHandle = await window.showDirectoryPicker()
    IndexedDB.set('saveDirHandle', this.saveDirHandle)
    debug(this.saveDirHandle.name, '디렉토리가 선택됨')
  }

  async obtainPermission () {
    this.saveDirHandle = await IndexedDB.get('saveDirHandle')

    if (this.saveDirHandle) {
      const permission = await this.saveDirHandle.queryPermission()
      if (permission === 'prompt') {
        await this.saveDirHandle.requestPermission()
      } else if (permission === 'denied') {
        throw new Error('permission denied')
      }
    } else {
      try {
        await this.promptDir()
      } catch (err) {
        throw new Error('prompt failed')
      }
    }
  }

  // 중복되는 파일명이 있을수도 있으므로 확인하고 중복시 (1), (2)와 같이 표시
  // 받는 파일 이름 및 생성되는 파일 이름은 확장자 포함
  // 전제: 디렉토리 핸들이 존재
  async createUniqueFileName (name) {
    if (!this.saveDirHandle) {
      throw new Error('directory not picked')
    }

    let fileName = name

    let id = 0
    const exitingFileNames = await asyncIteratorToArray(this.saveDirHandle.keys())
    const [namePart, extension] = splitExtension(name)

    while (exitingFileNames.includes(fileName)) {
      fileName = `${namePart} (${id}).${extension}`
      id++
    }

    return fileName
  }
}
