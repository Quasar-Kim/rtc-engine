import exportFromJSON from 'https://jspm.dev/export-from-json'

const img = document.querySelector('#target')

let received = 0
const records = {
  timestamp: [],
  received: []
}

async function main () {
  const res = await fetch('https://esahubble.org/media/archives/images/original/heic0611b.tif')
  const [rs1, rs2] = res.body.tee()

  const interval = setInterval(() => {
    console.log(received)

    records.timestamp.push(Date.now())
    records.received.push(received)
  }, 1000)

  // 기록
  rs1.pipeTo(new WritableStream({
    write: chunk => {
      received += chunk.length
    },
    close: () => {
      clearInterval(interval)
      exportFromJSON({
        data: records,
        fileName: 'dump',
        exportType: 'json'
      })
    }
  }))

  // 이미지 보여주기
  const _res = new Response(rs2)
  const blob = await _res.blob()
  img.src = URL.createObjectURL(blob)
}

document.querySelector('#start').addEventListener('click', main)
