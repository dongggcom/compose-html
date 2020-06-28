const _ = require('lodash');
const { Response } = require('../lib/context');

module.exports = (router, incomingMsg, res) => {
  const func = router.replace(/^\/router\//, '').replace('/', '.')
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

