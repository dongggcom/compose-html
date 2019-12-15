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

#### 描述

* 所有的模板路径都是由根目录出发
* 默认读取的文件路径为跟目录的 index.html

### 简单样例

```Bash
# 以demo为项目根目录
bin/compose-html start --root demo
```

```Bash
# 以dist为输出目录
bin/compose-html build --output dist
```

### 环境变量

* ROOT_PATH 项目的根目录路径
* OUTPUT_PATH 项目的输出路径