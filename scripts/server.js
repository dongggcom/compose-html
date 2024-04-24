/*
 * @Author: donggg
 * @LastEditors: donggg
 * @Date: 2020-05-21 18:18:37
 * @LastEditTime: 2021-04-21 18:21:42
 */
const http = require('http');
const fs = require('fs')
const { 
  getIP,
  getPort, 
  browse,
  getRootPath,
  getDirectSplit,
  read,
} = require('../lib/utils');
const { ROOT_PATH } = process.env;
const { HostNotFound } = require('../lib/context')
const includeMiddleware = require('../middleware/include');
const configMiddleware = require('../middleware/config');
const IP = getIP();
const SPLIT = getDirectSplit()
const rootPath = (ROOT_PATH ? ROOT_PATH : getRootPath()) + SPLIT;

// 服务
const createServer = (port, options) => http.createServer((incomingMsg, res)=>{
  // 渲染请求
  function render_req_html() {
    const router = require('../lib/HtmlRouter')(incomingMsg, options);
    const send = require('../lib/Send')(incomingMsg, res);
    const exclude = []
    
    // 为router注册中间件
    router.registerMiddleware(includeMiddleware)
    router.registerMiddleware(configMiddleware)

    // 初始化
    function init () {
      // TODO: 在目标项目中读取本地文件
      // 内置 favicon.ico
      // read('../demo/favicon.ico').then(({ data }) => router.routeAt(`${rootPath}favicon.ico`, data))

      // 加载默认html文件
      if (fs.existsSync(`${rootPath}index.html`)) {
        router.routeAt(`${rootPath}`, read(`${rootPath}index.html`))
      } else {
        router.routeAt(`${rootPath}`, read(`${rootPath}index.htm`))
      }

      // 过滤部分文件夹 /node_modules, .git, $OUTPUT_PATH 和指定文件
      // exclude
    }

    let timeout_fn = null;

    init()

    Promise.race([
      router.render(),
      new Promise(function(_, reject) {
        timeout_fn = function() {
          reject();
        };
      })
    ]).then((source) => {
      // 未找到目标资源
      if( router.isHtml(source) && router.isEmptyHtml(source) ){
        return send.notFound()
      }

      // Binary资源：图片、字体等
      if( router.isBinary(source) ){
        return send.success(source, router.filepath);
      }
      
      // html资源
      try {
        send.success(source, router.filepath);
      } catch (e) {
        // 资源出错
        console.log('source send error', e)
      }

    }, (e) => {
      send.success(e.message || HostNotFound)
    })

    // 超时响应
    setTimeout(function() {
      timeout_fn();
    }, 3000);
  }

  // 路由分发
  function router(r) {
    const url = new URL(incomingMsg.url, `http://${incomingMsg.headers.host}`)
    const { pathname } = url;
    const pattern = new RegExp(r)

    if (pattern.test(pathname)) {
      require('../router')(pathname, incomingMsg, res, r)
    } else {
      render_req_html()
    }
  }

  // example. 注册路由
  router('/router')

}).listen(port, ()=>{
  console.log(`server start: http://${IP}:${port}`)
});

module.exports = (options) => getPort().then(port => {
  const { open } = options;

  createServer(port, options)

  if (open) {
    browse(port)
  }
})



