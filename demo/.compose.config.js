module.exports = {
  proxy: {
    '/test': {
      'target': 'http://baidu.com',
      'rewrite': { '^/a': '' }
    }
  }
}