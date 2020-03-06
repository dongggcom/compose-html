const _ = require('lodash');

async function proxyHTML (html) {
  const { proxy } = process.env.CONFIG
  console.log('proxy', proxy, process.env.CONFIG)
  return html
}

function ConfigMiddleware (){}

ConfigMiddleware.prototype.onRender = async function( html, context ){
  // console.log('ConfigMiddleware.prototype.onRender before',html && _.isString(html))
  if( html && _.isString(html) ){
    html = proxyHTML.call( context.__app__, html );
  }
  // console.log('ConfigMiddleware.prototype.onRender after',html && _.isString(html))
  return html
}

module.exports = new ConfigMiddleware()