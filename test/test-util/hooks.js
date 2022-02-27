import sinon from 'sinon'
import { clearEngines } from './engineFactory.js'

afterEach(function () {
  sinon.restore()
  clearEngines()
})
