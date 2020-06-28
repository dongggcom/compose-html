/**
 * 读取执行目录下的配置文件
 * .compose.config.js 或 .compose.config.json
 */

const _ = require('lodash');

// 读取配置
function getConfig() {
  return process.env.CONFIG && JSON.parse(process.env.CONFIG)
}

// 仅对文本做简单替换
// /{{([^}]+)?}}/g 不能匹配中间带有一个}的字符，例如 {{a}a}}
function setEnvHTML (html) {
  const config = getConfig()
  if (!config) return html;
  const { env } = config;
  const keys = Object.keys(env)
  return keys.reduce((acc, key)=>acc.replace(`{{${key}}}`, env[key]), html)
}

function ConfigMiddleware (){}

ConfigMiddleware.prototype.onRender = function( html ){
  const context = this
  if( html && _.isString(html) ){
    html = setEnvHTML.call( context.__app__, html );
  }
  return html
}

module.exports = new ConfigMiddleware()