import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
    input: 'js/RTCEngine.js',
    output: {
        file: 'dist/RTCEngine.dev.js',
        format: 'esm',
    },
    plugins: [commonjs(), nodeResolve()]
}