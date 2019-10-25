const { resolve } = require('path')
const { writeFile, existsSync, mkdirSync } = require('fs')
const { getRootPath, parseItem } = require('../lib/utils')
const includeMiddleware  = require('../middleware/include')
const router = require('../lib/Router')()

router.registerMiddleware(includeMiddleware)

const mkDir = function (path, root){
  const p = resolve(root, path)
  if (!existsSync(p)) {
    mkdirSync(p)
  }
}

module.exports = ({ output }) => {

  mkDir(output)
  router.routeAll()
    .then(({ list, dirs }) => {
      dirs.forEach( p => mkDir( resolve(output, p.replace(getRootPath(), './'))) )
      return list.map((v)=>{
        const { path } = parseItem(v)
        const outputPath = resolve(output, path.replace(getRootPath(), './'))
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

    }).catch(err=>console.warn(`read direction happen error: ${err}`))
}