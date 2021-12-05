/**
 * legraphista의 simple-eta를 es module로 사용할 수 있도록 변형한 버전입니다.
 * simple-eta: https://github.com/legraphista/eta
 */

function makeLowPassFilter (RC) {
  return function (previousOutput, input, dt) {
    const alpha = dt / (dt + RC)
    return previousOutput + alpha * (input - previousOutput)
  }
}

function def (x, d) {
  return (x === undefined || x === null) ? d : x
}

export default function makeEta (options) {
  options = options || {}
  const max = def(options.max, 1)
  const min = def(options.min, 0)
  const autostart = def(options.autostart, true)
  const ignoreSameProgress = def(options.ignoreSameProgress, false)

  let rate = null
  let lastTimestamp = null
  let lastProgress = null

  const filter = makeLowPassFilter(def(options.historyTimeConstant, 2.5))

  function start () {
    report(min)
  }

  function reset () {
    rate = null
    lastTimestamp = null
    lastProgress = null
    if (autostart) {
      start()
    }
  }

  function report (progress, timestamp) {
    if (typeof timestamp !== 'number') {
      timestamp = Date.now()
    }

    if (lastTimestamp === timestamp) { return }
    if (ignoreSameProgress && lastProgress === progress) { return }

    if (lastTimestamp === null || lastProgress === null) {
      lastProgress = progress
      lastTimestamp = timestamp
      return
    }

    const deltaProgress = progress - lastProgress
    const deltaTimestamp = 0.001 * (timestamp - lastTimestamp)
    const currentRate = deltaProgress / deltaTimestamp

    rate = rate === null
      ? currentRate
      : filter(rate, currentRate, deltaTimestamp)
    lastProgress = progress
    lastTimestamp = timestamp
  }

  function estimate (timestamp) {
    if (lastProgress === null) { return Infinity }
    if (lastProgress >= max) { return 0 }
    if (rate === null) { return Infinity }

    let estimatedTime = (max - lastProgress) / rate
    if (typeof timestamp === 'number' && typeof lastTimestamp === 'number') {
      estimatedTime -= (timestamp - lastTimestamp) * 0.001
    }
    return Math.max(0, estimatedTime)
  }

  function getRate () {
    return rate === null ? 0 : rate
  }

  return {
    start: start,
    reset: reset,
    report: report,
    estimate: estimate,
    rate: getRate
  }
}
