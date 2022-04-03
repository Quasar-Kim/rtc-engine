let inGroup = false
let disabled = false

const methodToColorMap = {
  debug: '#7f8c8d', // Gray
  log: '#3498db', // Blue
  warn: '#f39c12', // Yellow
  error: '#c0392b', // Red
  groupCollapsed: '#3498db', // Blue
  groupEnd: null // No colored prefix on groupEnd
}

/**
 * 뱃지와 함께 로그를 찍습니다.
 * @param {'debug'|'log'|'warn'|'error'|'groupCollapsed'|'groupEnd'} method 사용할 로그 함수의 이름
 * @param {string} src 로그를 찍는 주체.
 * @param  {...any} args 찍을 로그의 내용들.
 */
function log (method, src, ...args) {
  if (disabled) return

  // prefix 뱃지 만들기
  const prefixStyle = [
    `background: ${methodToColorMap[method]}`,
    'border-radius: 0.5em',
    'color: white',
    'font-weight: bold',
    'padding: 2px 0.5em'
  ]

  // group안에 있을때는 뱃지를 숨겨야 함
  const logPrefix = inGroup ? [] : [`%c${src}`, prefixStyle.join(';')]

  // 로그 찍기
  console[method](...logPrefix, ...args)

  if (method === 'groupCollapsed') {
    inGroup = true
  } else if (method === 'groupEnd') {
    inGroup = false
  }
}

export default function createLogger (src) {
  return {
    debug: (...args) => log('debug', src, ...args),
    log: (...args) => log('log', src, ...args),
    warn: (...args) => log('warn', src, ...args),
    error: (...args) => log('error', src, ...args),
    groupCollapsed: (...args) => log('groupCollapsed', src, ...args),
    groupEnd: (...args) => log('groupEnd', src, ...args)
  }
}

export function disableLog () {
  disabled = true
}
