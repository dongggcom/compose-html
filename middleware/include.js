const _ = require('lodash');
const { resolve } = require('path')

// $工具声明
const INCLUDE_PATTERN = /@include\[(["'])\s*([^"'\s]+)\1\]/g;
const BELONG_PATTERN = /^@belong\[(["'])\s*([^"'\s]+)\1\]/;
const PLACEHOLDER_PATTERN = /@\[\s*placeholder\s*\]/g;
// TODO: @for @if @else @break;

const placeholderHtml = function (html, placeholder) {
  const c = new RegExp(PLACEHOLDER_PATTERN).exec(html)
  if( placeholder ){
    return html.replace(c[0], placeholder)
  }
  return html.replace(c[0], "")
}

const includeHtml = async function (html) {
  const c = new RegExp(INCLUDE_PATTERN).exec(html)
  if( c ){
    const includePath = resolve(this.rootpath, c[2])
    let include = this.store.get(includePath)
    if( !include ){
      include = await this.store.load(includePath)
    }
    if( include && !_.isEmpty (include) ){
      return html.replace(c[0], include)
    }
  }
  return html;
}

const belongHtml = async function (html) {
  const c = new RegExp(BELONG_PATTERN).exec(html)
  if( c ){
    const belongPath = resolve(this.rootpath, c[2])
    let belong = this.store.get(belongPath)
    if( !belong ){
      belong = await this.store.load(belongPath)
    }
    if( belong && !_.isEmpty (belong) ){
      return placeholderHtml( belong, html.replace(c[0], ""))
    }
  }
  return html;
}

function IncludeMiddleware (){}

IncludeMiddleware.prototype.onRender = async function( html, context ){
  if( html && _.isString(html) ){
    if( html.match(PLACEHOLDER_PATTERN) ){
      html = placeholderHtml.call( context.__app__, html );
    }
    if( html.match(BELONG_PATTERN) ){
      html = await belongHtml.call( context.__app__, html );
    }
    if( html.match(INCLUDE_PATTERN) ){
      html = await includeHtml.call( context.__app__, html );
    }
    return html;
  }
}

module.exports = new IncludeMiddleware()