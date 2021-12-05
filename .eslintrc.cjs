module.exports = {
  env: {
    browser: true,
    es2021: true,
    mocha: true
  },
  extends: [
    'standard'
  ],
  globals: {
    sinon: 'readonly',
    expect: 'readonly',
    chai: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'array-callback-return': 'off',
    'node/no-callback-literal': 'off'
  }
}
