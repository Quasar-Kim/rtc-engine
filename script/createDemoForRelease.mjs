import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
function resolveRelative (...paths) {
  return path.resolve(__dirname, ...paths)
}

async function main () {
  // 1. demo/dev를 복사해서 demo로 욺기기
  await fs.copy(resolveRelative('../demo/dev'), resolveRelative('../demo'))

  // 2. 현재 버전 가져오기
  const { version } = JSON.parse(await fs.readFile(resolveRelative('../package.json'), 'utf8'))

  console.log(`current version is ${version}`)

  // 2. docs/demo 안의 모든 html 파일의 버전 업데이트
  for (const file of fs.readdirSync(resolveRelative('../demo'))) {
    if (!file.endsWith('.html')) continue

    const filePath = resolveRelative('../demo', file)
    const contents = await fs.readFile(filePath, 'utf8')
    const updated = contents.replace('version: development(unstable)', `version: ${version}`)
    await fs.writeFile(filePath, updated)

    console.log(`updated ${file}`)
  }
}

main()
