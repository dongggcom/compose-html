module.exports = {
  proxy: {
    '/test': {
      'target': 'http://baidu.com',
      'rewrite': { '^/a': '' }
    }
  },
  env: {
    VERSION: 0.1,
    NAME: 'demo',
  }
}