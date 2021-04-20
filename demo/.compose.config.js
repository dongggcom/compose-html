const package = require('../package.json')
module.exports = {
  proxy: {
    '/test': {
      'target': 'http://baidu.com',
      'rewrite': { '^/a': '' }
    }
  },
  env: {
    VERSION: package.version,
    NAME: 'demo',
  }
}