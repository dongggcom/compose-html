// 响应结构体
const Response = function({status, message, data}){
  this.status = status;
  this.message = message;
  if( data !== undefined ) {
    this.data = data
  }
}

module.exports = {
  Response,
  HostNotFound: new Response({ status: 500, message: "主机未找到！"})
}
