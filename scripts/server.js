const http = require('http');
const fs = require('fs');
const { 
  getIP,
  getPort, 
  browse,
  getRootPath,
} = require('../lib/utils');
const { HostNotFound } = require('../lib/context')
const includeMiddleware = require('../middleware/include');
const IP = getIP();

const createServer = (port, options) => http.createServer((req, res, next)=>{
  const { watch } = options

  function running() {
    const router = require('../lib/Router')(req, options);
    const send = require('../lib/Send')(req, res);
    // 中间件
    router.registerMiddleware(includeMiddleware)

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

  // const { ROOT_PATH } = process.env;
  // 监听
  if( watch ){
    const watcher = require('../lib/Watch')(getRootPath(), {
      // 重启服务
      onProcess(){
        // console.log('onProcess',file, flies)
      }
    })
    watcher.start()
  }

  
}).listen(port, ()=>{
  console.log(`server start: http://${IP}:${port}`)
});

module.exports = (options) => getPort().then(port => {
  createServer(port, options)
  browse(port)
})



