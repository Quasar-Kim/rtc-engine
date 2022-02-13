function logConnection () {
  setInterval(() => {
    console.log(this.connection.get())
  }, 1000)
}

export default function testPlugin (RTCEngine) {
  RTCEngine.prototype.logConnection = logConnection
}
