const fs = require('fs');
const events = require('events');

class Watch extends events.EventEmitter {
  constructor(watchDir){
    super()
    this.watchDir = watchDir;
  }
  watch(){
    // 读取目标文件夹下的一级结构
    fs.readdir(this.watchDir, (err, files)=>{
      if(err) throw new Error('Read watching direction failed!')
      for(let index in files){
        this.emit('process', files[index])
      }
    })
  }
  reload(filename){
    console.log('Happen rename, need reloading!', filename)
  }
  start(){
    fs.watch(this.watchDir, (eventType, filename)=>{
      // 文件改变：并不是修改的目标文件，当存在关联文件改变时，会反映成关联文件
      if( eventType === 'change'){
        this.watch();
      }
      // 重命名：如果是目录下的文件，此处仅返回目录
      if( eventType === 'rename'){
        this.reload(filename);
      }
    })
  }
}

module.exports = (dir, { onProcess }) => {
  const watcher = new Watch(dir) 
  watcher.on('process', (file, files)=>onProcess(file, files))
  return watcher
}