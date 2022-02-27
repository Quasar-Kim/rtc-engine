import RTCEngine from '../../js/RTCEngine.js'

const instances = []

export function createEngine (...args) {
  const engine = new RTCEngine(...args)
  instances.push(engine)
  return engine
}

export function clearEngines () {
  for (const engine of instances) {
    if (engine.closed) continue

    engine.close()
  }
  instances.length = 0
}
