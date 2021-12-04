import { ObservableEntry, WaitEntry } from './ObservableEntry.js'

export default class ObservableMap {
  constructor () {
    /**
     * @type {Map<string, ObservableEntry>}
     */
    this.observableEntries = new Map()
  }

  get (key) {
    const observableEntry = this.observableEntries.get(key)
    return observableEntry.get()
  }

  set (key, val) {
    if (!this.has(key)) {
      this.observableEntries.set(key, new ObservableEntry())
    }

    const observableEntry = this.observableEntries.get(key)
    observableEntry.set(val)
    return this
  }

  delete (key) {
    return this.observableEntries.delete(key)
  }

  has (key) {
    return this.observableEntries.has(key)
  }

  wait (key) {
    if (!this.has(key)) {
      this.observableEntries.set(key, new ObservableEntry())
    }

    const observableEntry = this.observableEntries.get(key)
    return new WaitEntry({ observableEntry })
  }
}
