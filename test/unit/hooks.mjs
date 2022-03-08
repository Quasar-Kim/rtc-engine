import sinon from 'sinon'
import { clearEngines } from '../test-util/engineFactory.js'

export default function cleanup () {
  sinon.restore()
  clearEngines()
}
