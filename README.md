## 命令行工具

#### 是否运行成功
```Bash
compose-html --version
```

#### 启动server 
```Bash
compose-html start
```

#### 构建
```Bash
compose-html build
```

### 配置
* **env** 环境变量，KEY值替换模板中的{{KEY}} 

#### 描述

* 所有的模板路径都是由根目录出发
* 默认读取的文件路径为跟目录的 index.html
* 配置文件为 .compose-html.config.json 或 .compose-html.config.js；优先级 .compose-html.config.json > .compose-html.config.js

### 简单样例

```Bash
# 以demo为项目根目录
bin/compose-html start --root demo
```

```Bash
# 以dist为输出目录
bin/compose-html build --output dist
```

```Bash
# 指定打包的源
bin/compose-html build --output dist --root demo
```

```Bash
# 打开默认浏览器
bin/compose-html start --open
```

### 环境变量
* ROOT_PATH 项目的根目录路径
* OUTPUT_PATH 项目的输出路径

*环境变量在 process.env 中获取* 