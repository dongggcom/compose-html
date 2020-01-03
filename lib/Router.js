const { 
  getReqPath, 
  getAbsolutePath, 
  getRootPath, 
  parseItem, 
  read, 
  readList,
  memorizeDirReadList,
  getDirectSplit,
  isImgFile,
} = require('./utils')
const _ = require('lodash')

const EMPTY_HTML = '';
const IS_BINARY = 'binary'
const rootPath = getRootPath();
const SPLIT = getDirectSplit()

// ClientRequest 和 ResponseMessage 
function Router (req, options = {}) {
  const { root } = options
  this.req = req;
  const filename = getReqPath(req);
  const relativePathArr = filename.split(SPLIT)
  const relativePath = relativePathArr.slice(0, relativePathArr.length-1).join(SPLIT)
  this.filename = filename
  this.relativepath = relativePath
  this.rootpath = rootPath + SPLIT + ( root ? root + SPLIT : '') ;
  this.filepath = this.rootpath + filename;
  this.beforeMethods = [];
  this.onMethods = [];
  let state = {}
  // let o = new Proxy(state, { 
  //   get: (target, property, receiver) => 
  //     property[target] === undefined ? receiver : property[target],
  // })
  let o = state
  
  this.store = {
    // @return {*} | undefined
    get: (path) => _.get(o, path || []), 
    set: (path, data) => data && _.set(o, path || [], data), // default []
    // @return { list, dirs }
    loadAll: async (root=rootPath) => {
      const { list, dirs } = await memorizeDirReadList(root, 100)
      const { OUTPUT_PATH } = process.env
      let copy = list
      if( list.length > 0 ){
        if( OUTPUT_PATH ) {
          copy = copy.filter( v => {
            const { path } = parseItem(v)
            const regp = new RegExp(`${OUTPUT_PATH}`,"g")
            return !regp.test(path);
          })
        }
        copy.forEach(async (v)=> {
          const { path, value } = parseItem(v)
          const html = await value
          this.store.set(path, html.toString().trim())
        })
      }
      return { list: copy, dirs }
    },
    // @return string
    load: async (abPath) => {
      const source = await read(abPath)
      const isImg = isImgFile(abPath)
      if( isImg ){
        return IS_BINARY;
      }
      if( !source ) {
        return EMPTY_HTML
      }
      const { data } = source
      if( data && _.isBuffer(data) ){
        const html = data.toString().trim()
        this.store.set(this.filepath, html)
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

Router.prototype._beforeRender = function(data) {
  const app = { ...this };
  this.beforeMethods.forEach(function(m){
    if( typeof m === 'function'){
      data = m.call(this, data, { __app__: app });
    }
  });
  return data;
}

Router.prototype._onRender = function(data){
  const app = { ...this };
  this.onMethods.forEach(function(m) {
    if( typeof m === 'function'){
      data = m.call(this, data, { __app__: app });
    }
  });
  return data;
}

Router.prototype.routeAll = async function (root) {
  const load = await this.store.loadAll(root)
  return load
}

Router.prototype.route = async function (path) {
  if( path ){
    const html = this.store.get(path)
    if( !html ){
      return await this.store.load(path)
    }else{
      return html;
    }
  }
  return await this.store.load(this.filepath)
}

Router.prototype.render = async function(path){
  const source =  await this.route(path)

  await this._beforeRender(source)

  if( source && !_.isEmpty(source) ){
    return await this._onRender( source ) || source
  }
  return new Promise((resolve)=>{
    resolve(EMPTY_HTML)
  });
}

Router.prototype.isEmptyHtml = (html) => html === EMPTY_HTML

Router.prototype.isHtml = input => typeof input !== 'string' || input !== IS_BINARY 

Router.prototype.isBinary = input => input === IS_BINARY 

module.exports = (req, options) => new Router(req, options)
