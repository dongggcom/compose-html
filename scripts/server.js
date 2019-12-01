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
  // TODO:配置文件写入 process.env 中
  const router = require('../lib/Router')(req, options);
  const send = require('../lib/Send')(req, res);

  router.registerMiddleware(includeMiddleware)
  let timeout_fn = null;

  Promise.race([ router.render(), new Promise(function(_, reject) {
      timeout_fn = function() {
        reject();
      };
  }) ]).then((html)=>{
    if( router.isEmptyHtml(html) ){
      send.notFound()
    }
    send.success(html, router.filepath);
  }, ()=> {
    send.success(HostNotFound)
  })
  // 超时响应
  setTimeout(function() {
    timeout_fn();
  }, 3000);
  
}).listen(port, ()=>{
  console.log(`server start: http://${IP}:${port}`)
});

module.exports = (options) => {
  const { root } = options
  getPort().then(port => {
    createServer(port, { root })
    browse(port)
  })
}



