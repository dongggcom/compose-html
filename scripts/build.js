const { resolve } = require('path')
const { writeFile, existsSync, mkdirSync, unlinkSync, rmdirSync } = require('fs')
const { getRootPath, parseItem, readList } = require('../lib/utils')
const includeMiddleware  = require('../middleware/include')
const router = require('../lib/Router')()
const rootPath = getRootPath()
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
}

/**
 * 删除文件夹 DFS
 * @param {string} path 目标文件夹
 * @return {undefined}
 */
const delDir = function(path){
  if (path === rootPath) {
    console.warn("Don't set root path")
    return;
  }
  router.routeAll(path)
    .then(({ list, dirs }) => {
      list.map(l => unlinkSync(l))
      dirs.map(d => rmdirSync(d))
    }).catch(err=>console.warn(`delete direction in error: ${err}`))
}

module.exports = ({ output, root }) => {
  // TODO: 删除原打包文件
  // if( output ){
  //   delDir(output)
  // }
  mkDir(output)
  router.routeAll(root)
    .then(({ list, dirs }) => {
      dirs.forEach(p => mkDir(resolve(output, p.replace(rootPath, './'))))
      return list.map(v => {
        const { path } = parseItem(v)
        const outputPath = resolve(output, path.replace(rootPath, './'))
        const html = router.render(path)
        return { [outputPath]: html }
      })
    })
    .then((list) => {
      list.forEach( async (v)=>{
        const { path: outputPath, value } = parseItem(v)
        const html = await value;
        writeFile(outputPath, html, (err) => {
          if (err) {
            console.trace(err)
          } 
        })  
      })

    }).catch(err=>console.warn(`read direction in error: ${err}`))
}