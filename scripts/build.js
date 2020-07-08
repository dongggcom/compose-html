const { resolve } = require('path')
const fs = require('fs')
const { writeFile, existsSync, mkdirSync, unlinkSync, rmdirSync } = fs
const { getRootPath, parseItem, memorizeDirReadList, isImgFile } = require('../lib/utils')
const includeMiddleware  = require('../middleware/include')
const router = require('../lib/HtmlRouter')()
const rootPath = getRootPath()

// include 中间件
router.registerMiddleware(includeMiddleware)

/**
 * 创建文件夹
 * @param {string} path 
 * @param {string} root 
 * @return {undefined}
 */
const mkDir = function (path, root){
  const p = resolve(root, path)
  if (!existsSync(p)) {
    mkdirSync(p)
  }
  return new Promise((resolve) => resolve())
}

/**
 * 删除文件夹 DFS
 * @param {string} path 目标文件夹
 * @return {undefined}
 */
const delDir = function(path) {
  return new Promise((resolve, reject) => {
    if (!existsSync(path)) {
      return resolve();
    }
    if (path === rootPath) {
      return reject(new Error("Don't set root path"))
    }
    return memorizeDirReadList(path)
      .then(({ list, dirs }) => {
        list.map(l => unlinkSync(Object.keys(l)[0]))
        return dirs
      })
      .then(dirs => dirs.map(d => rmdirSync(d)))
      .then(()=>rmdirSync(path))
      .then(()=>resolve())
      .catch(err=>console.warn(`delete direction in error: ${err}`))
  })
}

module.exports = ({ output, root }) => {
  const fn = () => 
    router.routeAll(root)
      .then(({ list, dirs }) => {
        const _replaceRootpath = (_path, _rootPath, _output) => resolve(_output, _path.replace(_rootPath, './'))
        const _root = root || rootPath
        dirs.forEach(p => mkDir(_replaceRootpath(p, _root, output)))
        return list.map(v => {
          const { path } = parseItem(v)
          const outputPath = _replaceRootpath(path, _root, output)
          if(isImgFile(outputPath)){
            return { [outputPath]: fs.createReadStream(path) }
          }else{
            const html = router.render(path)
            return { [outputPath]: html }
          }
        })
      })
      .then((list) => {
        list.forEach( async (v) => {
          const { path: outputPath, value } = parseItem(v)
          const needBinary = isImgFile(outputPath)
          if( needBinary ){
            let readStream = value
            let writeStream = fs.createWriteStream(outputPath)
            readStream.pipe(writeStream)
          }else {
            const html = await value;
            writeFile(outputPath, html, (err) => {
              if (err) {
                console.trace(err)
              } 
            })  
          }
        })

      }).catch(err=>console.warn(`read direction in error: ${err}`))
  if (output) {
    async function run(){
      await delDir(output)
      await mkDir(output)
      await fn()
    }
    run()
  } else {
    fn()
  }
}