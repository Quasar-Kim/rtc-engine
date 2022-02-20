import { terser } from 'rollup-plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const terserOptions = {
  compress: {
    drop_console: true
  }
}

export default {
  input: 'js/index.js',
  output: [
    {
      file: 'dist/RTCEngine.min.js',
      format: 'esm',
      plugins: [terser(terserOptions)]
    },
    {
      file: 'dist/RTCEngine.js',
      format: 'esm'
    }
  ],
  plugins: [commonjs(), nodeResolve()]
}
