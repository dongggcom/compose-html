const _ = require('lodash');
const { resolve } = require('path')
const { composeFn } = require('../lib/utils')

// $工具声明
const INCLUDE_PATTERN = /@include\[(["'])\s*([^"'\s]+)\1\]/g;
const BELONG_PATTERN = /^@belong\[(["'])\s*([^"'\s]+)\1\]/;
const PLACEHOLDER_PATTERN = /@\[\s*placeholder\s*\]/g;
// TODO: @for @if @else @break;

const placeholderHtml = function (html, placeholder) {
  const c = new RegExp(PLACEHOLDER_PATTERN).exec(html)
  if (c) {
    if( placeholder ){
      return html.replace(c[0], placeholder)
    }
    return html.replace(c[0], "")
  }
  return html;
}

// 动态引入 include 文件
const includeHtml = function (html) {
  const c = new RegExp(INCLUDE_PATTERN).exec(html)
  if (c) {
    const includePath = resolve(this.rootpath, c[2])
    // TODO: 异步可能会导致不能加载
    const include = this.store.get(includePath)
    if (include) {
      return html.replace(c[0], include)
    }
  }
  return html;
}

// 动态引入 belong 文件
const belongHtml = function (html) {
  const c = new RegExp(BELONG_PATTERN).exec(html)
  if (c) {
    const belongPath = resolve(this.rootpath, c[2])
    const belong = this.store.get(belongPath)
    if (belong) {
      return placeholderHtml( belong, html.replace(c[0], ""))
    }
  }
  return html;
}

function IncludeMiddleware (){}

IncludeMiddleware.prototype.onRender = function(html) {
  const context = this

  // 是否合法
  const isContinue = soruceHtml => soruceHtml && _.isString(soruceHtml)
  
  // html翻译
  function htmlTranslate (context, soruceHtml, patten, translator) {
    if (isContinue && soruceHtml.match(patten)) {
      return translator.call(context, soruceHtml)
    }
    return soruceHtml
  }

  const placeholderTranslator = (soruceHtml) => {
    if (isContinue(soruceHtml)) {
      return htmlTranslate(context.__app__, soruceHtml, PLACEHOLDER_PATTERN, placeholderHtml)
    }
    return soruceHtml
  }
  const belongTranslator = (soruceHtml) => {
    if (isContinue(soruceHtml)) {
      return htmlTranslate(context.__app__, soruceHtml, BELONG_PATTERN, belongHtml)
    }
    return soruceHtml
  }
  const includeTranslator = (soruceHtml) => {
    if (isContinue(soruceHtml)) {
      return htmlTranslate(context.__app__, soruceHtml, INCLUDE_PATTERN, includeHtml)
    }
    return soruceHtml
  }

  const translatorChain = composeFn(
    includeTranslator,
    belongTranslator,
    placeholderTranslator,
  )

  return translatorChain(html)
}

module.exports = new IncludeMiddleware()