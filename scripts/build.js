const { resolve } = require('path')
const fs = require('fs')
const fse = require('fs-extra')
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
      .catch(err=>console.warn(`delete direction in error: ${err}`))
  })
}

module.exports = ({ output, root }) => {
  const fn = () => 
    router.routeAll(root)
      .then(({ list }) => {
        const _replaceRootpath = (_path, _rootPath, _output) => resolve(_output, _path.replace(_rootPath, './'))
        const _root = root || rootPath

        list.map((v) => {
          const { path } = parseItem(v)
          const outputPath = _replaceRootpath(path, _root, output)

          if (isImgFile(outputPath)) {
            fse.outputFileSync(outputPath, '', err => err && console.warn(`Output ${outputPath} fail!`, err))
            let readStream = fs.createReadStream(path)
            let writeStream = fs.createWriteStream(outputPath)
            readStream.pipe(writeStream)
          } else {
            router.render(path).then(html => fse.outputFile(outputPath, html, err => err && console.log(err)))
          }
        })
      })
      .then(() => console.log(`\n\r>>> Build success! output: ${output}\n\r`))
      .catch(err => console.warn('Build fail!', err))
  if (output) {
    async function run(){
      // await delDir(output)
      // await mkDir(output)
      await fse.emptyDir(output, err => err && console.error(`Delete ${output} fail!`, err))
      await fn()
    }
    run()
  } else {
    fn()
  }
}