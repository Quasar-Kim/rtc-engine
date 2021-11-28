import { terser } from 'rollup-plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

export default {
    input: 'js/index.js',
    output: {
        file: 'dist/RTCEngine.prod.js',
        format: 'esm',
    },
    plugins: [replace({ 
        'window?.process?.env?.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
    }), commonjs(), nodeResolve(), terser()]
}