const http = require('http');
const { 
  getIP,
  getPort, 
  browse,
} = require('../lib/utils');
const { HostNotFound } = require('../lib/context')
const includeMiddleware = require('../middleware/include');
const configMiddleware = require('../middleware/config');
const IP = getIP();

const createServer = (port, options) => http.createServer((req, res)=>{

  function running() {
    const router = require('../lib/Router')(req, options);
    const send = require('../lib/Send')(req, res);
    // 为router注册中间件
    router.registerMiddleware(includeMiddleware)
    router.registerMiddleware(configMiddleware)

    let timeout_fn = null;
    Promise.race([ router.render(), new Promise(function(_, reject) {
        timeout_fn = function() {
          reject();
        };
    }) ]).then((source)=>{
      if( router.isHtml(source) && router.isEmptyHtml(source) ){
        return send.notFound()
      }
      if( router.isBinary(source) ){
        return send.success(source, router.filepath);
      }
      send.success(source, router.filepath);
    }, (...r)=> {
      console.log(r)
      send.success(HostNotFound)
    })
    // 超时响应
    setTimeout(function() {
      timeout_fn();
    }, 3000);
  }

  running()

}).listen(port, ()=>{
  console.log(`server start: http://${IP}:${port}`)
});

module.exports = (options) => getPort().then(port => {
  createServer(port, options)
  browse(port)
})



