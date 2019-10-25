const tcpPortUsed = require('tcp-port-used')
const os = require('os')
const { resolve } = require('path')
const url = require('url')
const { Response } = require('./context');
const fs = require('fs')
const { statSync } = fs

// 执行函数前的函数
// var gn = fn.after(zn); g(); zn 的参数是 gn 的结果
const beforeFn = function(before, fn) {
  if( typeof fn !== 'function' ){
    console.error("first argument must be function!")
  }
  return function(...args){
    const first = before.apply(before, args)
    if( first === undefined ){
      console.warn("first function no return!")
      return fn.call(fn);
    }else{
      return fn.call(fn, first)
    }
  }
}

// 执行函数后的函数
// var gn = fn.after(zn); g(); zn 的参数是 gn 的结果
const afterFn = function(after, fn) {
  if( typeof fn !== 'function' ){
    console.error("first argument must be function!")
  }
  return function(...args){
    const r = fn.apply(fn, args)
    after.apply(after, args)
    return r
  }
}

// 获取当前主机的IP
const getIP = () => {
  const netIF = require('os').networkInterfaces();
  return (Object.keys(netIF).map(
    n => netIF[n].filter( 
      f => f.family === 'IPv4' && !f.internal
    )[0]
  ).filter(x => x)[0]).address || '127.0.0.1'
}

// 获取端口号
const getPort = (port = 8000) => tcpPortUsed.check(port, getIP())
  .then( 
    inUse => {
      if( inUse ) getPort(++port)
      return port
    }, 
    err => console.error(err)
  ).catch(err => console.error(err))

// TODO: websocket 通信
// 打开浏览器
const browse = (port = 80, host = getIP()) => {
  if(process.argv.includes('start')){ 
    setTimeout(function () {
      require('child_process').exec((/Windows/.test(os.type()) ? 'explorer ' : 'open ') + "http://" + host + ':' + port)
    }, 1000)
  }
}

// 根据 requestClient 获取路径
const getReqPath = (req) => {
  if( !req ) return "";
  const location = url.parse(req.url)
  return (location.pathname.match(/[^/\\]+/g) || []).join('/')
}

// 获取根目录
const getRootPath = () => {
  return process.cwd()
}

const getAbsolutePath = ( path ) => {
  return getRootPath()+"/"+path;
}

const isResponse = (input) => input instanceof Response;

const createPathReplacer = (path) => path.replace(/[\\/]+/g, '_').replace(/\./g, '@')

const readPathFiles = p => new Promise(function (resolve, reject) {
  fs.readFile(p, function(error, data) {
    if (error) return reject(error);
    resolve(data);
  });
});

const readPathDir = p => new Promise(function (resolve, reject) {
  fs.readdir(p, function(error, data) {
    if (error) return reject(error);
    resolve(data);
  });
});

function memorize(fn){
  let cache = new Set()
  return (...args) => {
    const r = fn.apply(fn, args);
    if( _.isArray(r) ){
      r.forEach(function(rr){
        if ( !cache.has(rr) ) {
          cache.add(rr)
        }
      })
    }
    else if ( !cache.has(r) ) {
      cache.add(r)
    }
    return cache;
  }
}

// @return array 
const readList = async function(path = getRootPath(), depth = 1, clk) {
    const stats = statSync(path)
    if( stats.isFile() || depth < 0 ){
      return [{ [path]: read(path) }]
    }

    const dirItems = await readPathDir(path)
    return dirItems.reduce(async function(acc, cur){ 
      const curPath = resolve(path, cur)
      const curStats = statSync(curPath)
      const accAsync = await acc
      if( clk ){
        clk(curPath, curStats)
      }
      if( curStats.isFile() ){
        return accAsync.concat({ [curPath]: read(curPath) })
      }else if( curStats.isDirectory() ){
        const listAsync = await readList(curPath, depth-1)
        return accAsync.concat(listAsync)
      }
    }, []) 
}

// @return Promise || null
const read = async function(path) {
  const isExist = await fs.existsSync(path)
  if(!isExist ){
    return null
  }

  const stats = statSync(path)
  
  if( stats.isFile() ){ 
    return await readPathFiles(path).catch(() => console.error(`get file failed: ${path}`))
  }else if( stats.isDirectory() || statSync(path + "/index.html").isFile() ){
    return await readPathFiles(path + "/index.html").catch(() => console.error(`get file failed: ${path}`));
  }
  return null;
}

// @return {}
const memorizeDirReadList = async function(path, depth){
  const dirs = new Set();
  const list =  await readList(path, depth, function(path, stats){
    if( stats.isDirectory() && !dirs.has(path) ){
      dirs.add(path)
    }
  })
  return {
    list,
    dirs: [...dirs],
  }
}


const parseItem = (item) => ({
  path: Object.keys(item)[0],
  value: Object.values(item)[0]
})

module.exports = { 
  beforeFn,
  afterFn,
  getIP,
  getPort,
  getReqPath,
  getRootPath,
  getAbsolutePath,
  parseItem,
  createPathReplacer,
  browse,
  read,
  readList,
  memorizeDirReadList,
  isResponse,
}