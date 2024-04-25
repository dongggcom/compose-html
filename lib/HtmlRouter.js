/**
 * 文件路由器，根据 url 请求及 process.env.ROOT_PATH 参数访问文件
 */

const { 
  getReqPath, 
  getRootPath, 
  parseItem, 
  read, 
  memorizeDirReadList,
  getDirectSplit,
  isImgFile,
  composeFn,
} = require('./utils')
const _ = require('lodash')
const { RenderFail } = require('./context')

const EMPTY_HTML = '';
const IS_BINARY = 'binary'
const BEFORE_ROUTER = []
const BEFORE_ROUTER_PATH = []
const rootPath = getRootPath();
const SPLIT = getDirectSplit()
const state = {}

function Router (req) {
  const { ROOT_PATH } = process.env;
  const filename = getReqPath(req);
  const relativePathArr = filename.split(SPLIT)
  const relativePath = relativePathArr.slice(0, relativePathArr.length-1).join(SPLIT)
  
  this.req = req; // 当前请求的信息
  this.filename = filename // 当前请求的文件名
  this.relativepath = relativePath // 当前请求的文件相对路径
  this.rootpath = (ROOT_PATH ? ROOT_PATH : rootPath) + SPLIT; // 根路径
  this.filepath = this.rootpath + filename; // 当前请求的文件路径
  this.beforeMethods = []; // render 前执行的中间件方法
  this.onMethods = []; // render 过程时执行的中间件方法

  this.getFilepathWithDefault = (filepath) => filepath === this.rootpath ? filepath  + 'index.html' : filepath

  this.store = {
    createKey: (input) => typeof input === 'string' ? input.split('.') : [],
    // @return {*} | undefined
    get: (path) => _.get(state, this.store.createKey(path)), 
    set: (path, data) => data && _.set(state, this.store.createKey(path), data), // default []
    has: (path) => _.has(state, this.store.createKey(path)),
    // @return { list, dirs }
    loadAll: async (root = rootPath) => {
      if (this.store.has(root)) {
        return this.store.get(root);
      }
      return memorizeDirReadList(root).then(({ list, dirs }) => {
        const { OUTPUT_PATH } = process.env
        let copy = [].concat(list)
        // list: [{ path: Promise }]
        // Before: {path, Promise}

        // 合并前置路由内容
        if (BEFORE_ROUTER_PATH.length) {
          const before = []
          BEFORE_ROUTER_PATH.forEach((path, index) => {
            const item = {}
            item[path] = BEFORE_ROUTER[index]
            before.push(item)
          })
          copy = copy.concat(before)
        }

        if (list.length > 0) {
          // 过滤带有输出路径的文件
          if (OUTPUT_PATH) {
            copy = copy.filter( v => {
              const { path } = parseItem(v)
              const regp = new RegExp(`${OUTPUT_PATH}`,"g")
              return !regp.test(path);
            })
          }

          // 将地址注册进入 store
          copy.forEach(async (v)=> {
            const { path, value } = parseItem(v)
            if (path === rootPath) {
                return;
            }
            const { data: html } = await value
            if (!isImgFile(path)) {
              this.store.set(path, html.toString().trim())
            }
          })
        }

        // 根路径储存内容
        const rootState = { list: copy, dirs }

        // 缓存
        this.store.set(root, rootState)

        return rootState
      })
    },
    // @return string
    load: async (abPath) => {
      if (this.store.has(abPath)) {
        return this.store.get(abPath);
      }
      const source = await read(abPath)
      const isImg = isImgFile(abPath)
      if( !source ) {
        return EMPTY_HTML
      }
      if( isImg ){
        return IS_BINARY;
      }
      const { data } = source
      if( data && _.isBuffer(data) ){
        const html = data.toString().trim()
        const filepath = this.getFilepathWithDefault(abPath)
        this.store.set(filepath, html)
        return html
      }
      return EMPTY_HTML
    }
  };
}

Router.prototype.registerMiddleware = function (middleware){
  if(middleware.beforeRender){
    this.beforeMethods.push(middleware.beforeRender)
  } 
  if(middleware.onRender){
    this.onMethods.push(middleware.onRender)
  } 
  if( !middleware.beforeRender && !middleware.onRender ) {
    console.warn(`middleware ${middleware}: can't register middleware! `)
  }
}

Router.prototype._onRender = function(data){
  const context =  _.omit(this, ['req', 'beforeMethods', 'registerMiddleware', 'onMethods', '_onRender']);
  const app = { ...context, route: this.route };
  const onRenders = this.onMethods.reduce((acc, method) => (...args) => acc.call({ __app__: app, ...context }, method(...args)))
  return onRenders.call({ __app__: app, ...context }, data)
}

// 指定路由加载的文件
Router.prototype.routeAt = function (path, content) {
  try {
    BEFORE_ROUTER.push(content)
    BEFORE_ROUTER_PATH.push(path)
    return true;
  } catch (e) {
    console.log('route at target happen error', e)
    return false;
  }
}

// 加载根目录下所有文件并缓存
Router.prototype.routeAll = function(root) {
  return this.store.loadAll(root)
}

// 动态路由：若未加载过则重新加载并返回
Router.prototype.route = async function(path) {
    try {
        const source = await this.store.load(path);
        if (source) {
          return this._onRender(source) || source;
        }
        return EMPTY_HTML
    } catch (e) {
        console.log(`Router error [${path}]`, e.message)
        return EMPTY_HTML;
    }
}

// 根据路径渲染html，当未传递path时，渲染当前请求的文件
Router.prototype.render = function (path) {
  return this.routeAll(this.rootpath)
    .then(() => this.route(path || this.getFilepathWithDefault(this.filepath)))
    .catch((e) => {
        console.log('Render error', e.message)
        throw new Error(RenderFail)
    })
}

Router.prototype.isEmptyHtml = (html) => html === EMPTY_HTML

Router.prototype.isHtml = input => typeof input !== 'string' || input !== IS_BINARY 

Router.prototype.isBinary = input => input === IS_BINARY 

module.exports = (req, options) => new Router(req, options)
