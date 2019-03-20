module.exports = {
  "env": {
    "es6": true
  },
  "extends": "eslint:recommended",
  "globals": {
    "Atomics": "readonly",
    "SharedArrayBuffer": "readonly",
    "Chart": "readonly",
    "R": "readonly",
    "axios": "readonly",
    "rxjs": "readonly"
  },
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  }
}