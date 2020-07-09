const ETag = require('etag')
const mime = require('mime')
const url = require('url')
const fs = require('fs')
const { isResponse, getRootPath, isImgFile, isNeedBinary } = require('./utils')
const pkg = require(`${getRootPath()}/package.json`)
const version = `${pkg.name} ${pkg.version}`;

const Send = function(incomingMsg, respServer){
  this.respServer = respServer
  this.incomingMsg = incomingMsg;
};

Send.prototype.end = function (body, header) {
  const respServer = this.respServer;
  const newTag = ETag(body.toString())

  respServer.writeHead(200, { 
    'Content-type': "text/plain; charset=utf-8",
    'Content-Length': Buffer.byteLength(body),
    'X-Powered-By': version,
    'ETag': newTag,
    ...header,
  })
  respServer.end(body)
  return respServer
}

Send.prototype.javascript = function (data) {
  return this.end(data, {
    'Content-type': "text/javascript; charset=utf-8",
  })
}

Send.prototype.html = function (data) {
  return this.end(data, {
    'Content-type': "text/html; charset=utf-8",
  })
}

Send.prototype.json = function (data) {
  return this.end(JSON.stringify(data), {
    'Content-type': "application/json; charset=utf-8",
  })
}

Send.prototype.text = function (data) {
  return this.end(data, {
    'Content-type': "text/plain; charset=utf-8",
  })
}

Send.prototype.image = function (pathname) {
  const respServer = this.respServer;
  const steam = fs.createReadStream(pathname)
  const newTag = ETag(steam.toString())
  let header = {
    'Content-Type': mime.getType(pathname) + '; charset=utf-8',
    'Content-Encoding': 'utf-8',
    'X-Powered-By': version,
    'ETag': newTag
  }
  respServer.writeHead(200, header)
  steam.pipe(respServer)
  return respServer
}

Send.prototype.error = function(respObj) {
  // return this.json(respObj)
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
  if (isResponse(data)) { 
    return this.json(data);
  }
  const newTag = ETag(data.toString())
  let header = {
    'Content-Type': mime.getType(pathname) + '; charset=utf-8',
    'Content-Encoding': 'utf-8',
    'X-Powered-By': version,
    'ETag': newTag
  }
  respServer.writeHead(200, header)
  const isImg = isImgFile(pathname)
  const needBinary = isNeedBinary(pathname)

  // console.log('\n', pathname, needBinary)
  if (isImg) {
    fs.createReadStream(pathname).pipe(respServer)
  } else if (needBinary) {
    fs.createReadStream(pathname).pipe(respServer)
  } else {
    respServer.end( data )
  }
  return respServer
};

Send.prototype.notFound = function() {
  const respServer = this.respServer;
  const incomingMsg = this.incomingMsg;
  const pathname = url.parse(incomingMsg.url).pathname
  respServer.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Powered-By': version
  })
  respServer.end('<meta charset="utf-8"/>' +
      '<h2 style="text-align: center"> 404: <small>"' + pathname + '"</small>  is gone!</h2>')
  return respServer
};

module.exports = (req, res) => new Send(req, res)