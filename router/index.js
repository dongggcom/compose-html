/**
 * 自定义路由
 * 例如
 * 访问 /test， _.set(routers, 'test', function(){})
 * 访问 /parent/child， _.set(routers, 'parent.child', function(){})
 */

const _ = require('lodash');
const { Response } = require('../lib/context');

module.exports = (route, incomingMsg, res, routerBase) => {
  const pattern = new RegExp(routerBase + '/')
  const func = route.replace(pattern, '').replace('/', '.')
  const routerFunc = _.get(routers, func)
  if (routerFunc && _.isFunction(routerFunc)) {
    routerFunc(incomingMsg, res)
  }
}
const routers = {}

_.set(routers, 'test',
  function(incomingMsg, res) {
    const send = require('../lib/Send')(incomingMsg, res);
    send.success(new Response({
      status: 200, 
      message: 'success request!', 
    }));
  }
)

_.set(routers, 'parent.child',
  function(incomingMsg, res) {
    const send = require('../lib/Send')(incomingMsg, res);
    send.success(new Response({
      status: 200, 
      message: 'get child and success request!', 
    }));
  }
)

// json 样例
_.set(routers, 'jsonp', 
  function(incomingMsg, res) {
    require('./jsonp')(incomingMsg, res)
  }
)
