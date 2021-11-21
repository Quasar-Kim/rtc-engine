export default function once(eeOrEventTarget, type) {
    return new Promise(resolve => {
        if ('once' in eeOrEventTarget) {
            eeOrEventTarget.once(type, evt => {
                resolve(evt)
            })
        } else if ('addEventListener' in eeOrEventTarget) {
            eeOrEventTarget.addEventListener(type, evt => {
                resolve(evt)
            }, { once: true })
        }
    })
}