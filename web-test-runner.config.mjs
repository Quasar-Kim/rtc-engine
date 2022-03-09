export default {
  nodeResolve: true,
  browserLogs: false,
  files: [
    'test/unit/**/*.test.js'
  ],
  coverageConfig: {
    // 외부 의존성들은 커버리지에서 무시
    exclude: [
      'js/util/eta.js',
      'js/util/Mitt.js',
      'js/util/prettyBytes.js'
    ],
    include: [
      'js/**/*.js'
    ]
  },
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
