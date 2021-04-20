/**
 * 模拟 jsonp  
 */
 module.exports = (incomingMsg, res) => {
  const url = new URL(incomingMsg.url, `http://${incomingMsg.headers.host}`)
  const send = require('../lib/Send')(incomingMsg, res);
  const { searchParams } = url;

  for( let [key, value] of searchParams) {
    if (key === 'callback') {
      send.javascript(value + '("'+ 'get josnp success' +'")')
    }
    break;
  }
 }
