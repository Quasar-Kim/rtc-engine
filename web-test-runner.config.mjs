export default {
  nodeResolve: true,
  browserLogs: false,
  files: [
    'test/unit/**/*.test.js'
  ],
  testFramework: {
    config: {
      rootHooks: {}
    }
  },
  testRunnerHtml: testFramework => `
  <html>
    <body>
      <script type="module">
        import cleanup from './test/unit/hooks.mjs'

        window.__WTR_CONFIG__.testFrameworkConfig.rootHooks = {
          afterEach () {
            cleanup()
          }
        }
      </script>
      <script id="uit" type="module" src="${testFramework}"></script>
    </body>
  </html>
  `
}
