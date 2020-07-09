const tcpPortUsed = require('tcp-port-used')
const os = require('os')
const _ = require('lodash');
const { resolve } = require('path')
const url = require('url')
const { Response } = require('./context');
const fs = require('fs')
const { statSync } = fs

// 合法判断
const isIdentity = input => {
  if (input !== NaN || input != undefined) {
    return true;
  }
  return false;
}

// 根据操作系统，返回文件夹分隔符
const getDirectSplit = () => os.type().match(/Windows/) ? '\\' : '/'
const SPLIT = getDirectSplit()

/**
 * 声明函数执行前的函数
 * @param {Function} before 执行前的函数
 * @param {Function} fn 原函数
 * @return {Function}
 * @example var gn = fn.after(zn); g(); zn 的参数是 gn 的结果
 */
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

/**
 * 声明函数执行后的函数
 * @param {Function} after 执行后的函数
 * @param {Function} fn 原函数
 * @return {Function}
 * @example var gn = fn.after(zn); g(); zn 的参数是 gn 的结果
 */
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
      if( inUse ) return getPort(++port)
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

// 获得跟目录的绝对路径
const getAbsolutePath = ( path ) => {
  return getRootPath()+SPLIT+path;
}

// Response 对象判断
const isResponse = (input) => input instanceof Response;

// 根据文件名判断文件类型
const isImgFile = path => {
  if (!isIdentity(path)) {
    throw new Error("Type Error: param path is illegal")
  }
  return /\.(ico|jpg|jpeg|gif|png)$/.test(path)
}

// 根据文件名判断是否需要二进制文件输出
const isNeedBinary = path => {
  if (!isIdentity(path)) {
    throw new Error("Type Error: param path is illegal")
  }
  if (/\/|\\$/.test(path)) {
    return false;
  }
  return !/\.(html|text|htm|json|js|css)$/.test(path)
}

// 返回文件的后缀
const getFileType = filepath => {
  const a = filepath.split("")
  return filepath.substr(_.indexOf(a, ".", -a.length)+1)
}

// 对图片数据以二进制读取
const readPathFiles = p => new Promise(function (resolve, reject) {
  const needBinary = isImgFile(p)
  const handler = function(error, data) {
    if (error) return reject(error);
    resolve({type: getFileType(p), data});
  }
  if( needBinary ){
    fs.readFile(p, 'binary', handler);
  } else {
    fs.readFile(p, handler);
  }
});

// 根据地址读取文件，返回 Promise ，读取成功 Promise 返回结果为该文件的二进制数据
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


/**
 * 读取path下的所有文件(DFS)，返回一维数组，空文件夹路径不返回
 * @param {string} path 目标目录
 * @param {int} depth 目录遍历深度
 * @param {function} clk 回调函数，不建议使用有副作用的函数，会影响后续遍历
 * @return {promise} 返回 [{ filepath: Promise }] 包含所有文件 
 */
const readList = async function(path = getRootPath(), depth = 100, clk) {
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

/**
 * 扫描路径下的文件
 * @param {*} path 扫描的路径
 * @return { Promise || null } 当前路径是文件则返回 Promise
 */
const read = async function(path) {
  const isExist = await fs.existsSync(path)
  if(!isExist ){
    return null
  }

  const stats = statSync(path)

  if( stats.isFile() ){ 
    return await readPathFiles(path).catch(() => console.error(`get file failed: ${path}`))
  }
  // 是文件夹则探查路径下的index.html是否存在，存在返回该文件的 Promise。除以上情况返回 null
  // else if( stats.isDirectory() && statSync(path + SPLIT + "index.html").isFile() ){
  //   return await readPathFiles(path + SPLIT + "index.html").catch(() => console.error(`get index file failed: ${path}`));
  // }
  return null;
}

/**
 * 扫描路径下文件及文件夹的过程中，将文件夹记录下来
 * @param {*} path 扫描的路径
 * @param {*} depth 扫描深度
 * @return { list: Array, dirs: Array } list 为文件夹和文件的数组，dirs为文件夹数组
 */
const memorizeDirReadList = async function(path, depth = 100){
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

// 格式化item
const parseItem = (item) => ({
  path: Object.keys(item)[0],
  value: Object.values(item)[0]
})

/**
 * 对单参数函数进行从右到左的组合, 最右的函数可以是多参数的.
 *
 * @param funcs 需要进行组合的函数
 * @returns 返回组合后的函数. 比如, `composeFn(f, g, h)` 转换后 `(...args) => f(g(h(...args)))`.
 */

function composeFn(...funcs) {
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

const reg = /(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(?::\d+)?|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/;

function isUrl(path) {
  return reg.test(path);
}

module.exports = { 
  isImgFile,
  isNeedBinary,
  getFileType,
  beforeFn,
  afterFn,
  getIP,
  getPort,
  getReqPath,
  getRootPath,
  getAbsolutePath,
  getDirectSplit,
  parseItem,
  browse,
  read,
  readList,
  memorizeDirReadList,
  isResponse,
  composeFn,
  isUrl,
}