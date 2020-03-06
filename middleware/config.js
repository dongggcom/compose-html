const _ = require('lodash');

async function proxyHTML (html) {
  const { proxy } = process.env.CONFIG
  console.log('proxy', proxy, process.env.CONFIG)
  return html
}

function ConfigMiddleware (){}

ConfigMiddleware.prototype.onRender = async function( html, context ){
  if( html && _.isString(html) ){
    html = proxyHTML.call( context.__app__, html );
  }
  return html
}

module.exports = new ConfigMiddleware()