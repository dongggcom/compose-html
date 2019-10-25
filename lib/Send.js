const ETag = require('etag')
const mime = require('mime')
const url = require('url')
const { isResponse, getRootPath } = require('./utils')
const pkg = require(`${getRootPath()}/package.json`)
const version = `${pkg.name} ${pkg.version}`;

const Send = function(reqClient, respServer){
  this.respServer = respServer
  this.reqClient = reqClient;
};

Send.prototype.error = function(respObj) {
  const respServer = this.respServer;
  const body = JSON.stringify(respObj)
  respServer.writeHead(500, { 
    'Content-type': "application/json; charset=utf-8",
    'Content-Length': Buffer.byteLength(body),
    'X-Powered-By': version
  })
  respServer.end(body)
  return respServer
};

Send.prototype.success = function( data, pathname ){
  const respServer = this.respServer;
  if( isResponse(data) ){ 
    respServer.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': 'utf-8',
    })
    respServer.end(JSON.stringify(data));
    return respServer;
  }
  const newTag = ETag(data.toString())
  let header = {
    'Content-Type': mime.getType(pathname) + '; charset=utf-8',
    'Content-Encoding': 'utf-8',
    'X-Powered-By': version,
    'ETag': newTag
  }
  respServer.writeHead(200, header)

  respServer.end( data )
  return respServer
};

Send.prototype.notFound = function() {
  const respServer = this.respServer;
  const reqClient = this.reqClient;
  const pathname = url.parse(reqClient.url).pathname
  respServer.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Powered-By': version
  })
  respServer.end('<meta charset="utf-8"/>' +
      '<h2 style="text-align: center"> 404: <small>"' + pathname + '"</small>  is gone!</h2>')
  return respServer
};

module.exports = (req, res) => new Send(req, res)