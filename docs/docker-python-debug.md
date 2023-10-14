## docker-compose 添加调试命令
创建一个docker-compose-debug.yml 专门用来启动调试模式的容器
```
services:
   app:
     build: .
     working_dir: /app
     ports:
       - 5050:5050   
       - 5678:5678 
     volumes:
       - ./:/app
     restart: always
     # command: sh -c "tail -f /dev/null"
     command: sh -c "python -m debugpy --listen 0.0.0.0:5678 --wait-for-client  /app/houtai.py"
```
### 容器启动时，执行的command 命令
注意这一行：
```
command: sh -c "python -m debugpy --listen 0.0.0.0:5678 --wait-for-client  /app/houtai.py"
```

相比普通的docker- compose.yml，这里的command改变了，启动了debugpy模块，`/app/houtai.py`主程序是要调试的程序。

chatgpt 的解释如下：

这是一个在容器中运行的命令，用于启动 Python 调试器并监听指定的地址和端口。

让我们逐个解释这个命令的各个部分：

- `sh -c`：这是一个用于在容器中运行命令的 Shell 命令。`-c` 参数表示后面的字符串将作为命令执行。

- `"python -m debugpy --listen 0.0.0.0:5678 --wait-for-client /app/houtai.py"`：这是要执行的命令。它使用了 Python 的 `debugpy` 模块，用于启动 Python 调试器。

  - `python -m debugpy`：使用 `python` 命令来执行 `debugpy` 模块。`-m` 参数表示执行模块。

  - `--listen 0.0.0.0:5678`：指定调试器监听的地址和端口。在这个例子中，它指定调试器监听在容器内部的 IP 地址 `0.0.0.0` 和端口 `5678`。

  - `--wait-for-client`：调试器将等待客户端连接。这意味着调试器会在启动后暂停执行，并等待外部的调试客户端连接到它。

  - `/app/houtai.py`：这是要调试的 Python 脚本的路径。在这个例子中，它指定了 `/app` 目录下的 `houtai.py` 文件作为要调试的目标。

该命令的目的是在容器中启动 Python 调试器，并等待外部的调试客户端连接。通过连接调试客户端，你可以与正在运行的 Python 代码进行交互式调试。

请注意，要成功运行这个命令，你需要确保在容器中已经安装了 Python 和 `debugpy` 模块，并将要调试的 Python 脚本放置在 `/app/houtai.py` 路径下你的容器中使用了不同的路径，请相应地修改命令）。

注意启动容器前，需要安装 `debugpy` ，即容器镜像需要先安装好该模块：`pip install debugpy`, 本项目中 requirements.txt 已经包含 `debugpy`, 构建镜像时会自动安装该模块。

### 调试器端口映射

除了上面所述的，还需要开启调试器监的端口，容器外部的调试器客户端将使用这个端口连接容器的`debugpy` 调试器
端口映射：
```
ports:
    - 5678:5678 
```

## vscode 调试器客户端配置
如果还没有创建过 launch.json, 可以按照下面操作：

vscode 打开运行调试，点击添加配置，选择python -〉远程附加，会自动创建以下内容。

如果已经存在 launch.json , 那么可参考下面的配置进行添加。
```
{
     // 使用 IntelliSense 了解相关属性。 
     // 悬停以查看现有属性的描述。
     // 欲了解更多信息，请访问: https://go.microsoft.com/fwlink/?linkid=830387
     "version": "0.2.0",
     "configurations": [
         {
             "name": "Python: 远程附加",
             "type": "python",
             "request": "attach",
             "connect": {
                 "host": "localhost",
                 "port": 5678
             },
             "pathMappings": [
                 {
                     "localRoot": "${workspaceFolder}",
                     "remoteRoot": "/app"
                 }
             ],
             "justMyCode": false
         }
     ]
 } 
```

注意路径映射：
```
"pathMappings": [
    {
        "localRoot": "${workspaceFolder}",
        "remoteRoot": "/app"
    }
],                 
```
localRoot : 表示 本地路径，${workspaceFolder} 表示vscode当前打开的工作区（Workspace）的根文件夹路径
remoteRoot : 表示远程路径
这两个路径中的文件要保持一致

配置连接
```
"connect": {
    "host": "localhost",
    "port": 5678
},
```
因为`debugpy` 调试器在本地容器，所以这里 `host` 的值为 “localhost”
端口与 `debugpy` 调试器 保持一致。

justMyCode 设置为 `false` , 这表明 调试时可以进入第3方的代码中，不仅仅是工作目录中代码

