## docker 基本使用

基于 CentOS 7.3

### docker 安装

```bash
# 卸载旧版本 docker
 sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

 # 设置仓库
  sudo yum install -y yum-utils \
  device-mapper-persistent-data \
  lvm2

# 使用以下命令来设置稳定的仓库。
sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo

# 正式安装
sudo yum install docker-ce docker-ce-cli containerd.io

# 验证安装
docker version

# 更新
sudo yum update docker-ce

# 卸载
sudo yum remove docker-ce

# 启动
sudo systemctl start docker

# 设置开机自启动
sudo systemctl enable docker


```

> Docker 已经安装完成了后，Docker 服务没有启动的

### docker Image 操作

```bash
# 列出 image
docker image ls

# 拉取
docker image pull [imageName]

# 移除
docker image rm [imageName]
```

### docker Container 操作

```bash
# 列出 本机运行容器
docker container ls

# 列出 本机所有容器，包含终止
docker container ls --all

#从 image 文件生成容器
docker container run -p 8000:3000 -it koa-demo:0.0.1 /bin/bash

# 拉取 & 启动容器
docker container run -it ubuntu bash

# 启动容器
docker container start [containerId]

# 重启容器
docker container restart [containerId]

# 停止容器
docker container stop [containerId]
# kill 数据可能丢失
docker container kill [containerId]

# 移除容器
docker container rm [containerId]

# 查看容器日志
docker container logs [containerID]

# 进入正在运行的容器
docker container exec -it [containerID] /bin/bash

# 容器内部文件拷贝到本机
docker container cp [containID]:[/path/to/file]

```

**run 命令 说明：**

- -p 参数：容器的 3000 端口映射到本机的 8000 端口。
- -it 参数：容器的 Shell 映射到当前的 Shell，然后你在本机窗口输入的命令，就会传入容器。
- koa-demo:0.0.1：image 文件的名字（如果有标签，还需要提供标签，默认是 latest 标签）。
- /bin/bash：容器启动以后，内部第一个执行的命令。这里是启动 Bash，保证用户可以使用 Shell。

### docker 创建镜像

#### Dockerfile 配置

1. 创建 `.dockerignore` 文件

```text
.git
node_modules
npm-debug.log
```

2. 创建 `Dockerfile` 文件

```text
FROM node:8.4
COPY . /app
WORKDIR /app
RUN npm install --registry=https://registry.npm.taobao.org
EXPOSE 3000
```

3. 构建

```bash
docker image build -t [imageName]:[tag]
```

**Dockerfile 说明：**

- FROM node:8.4：该 image 文件继承官方的 node image，冒号表示标签，这里标签是 8.4，即 8.4 版本的 node。
- COPY . /app：将当前目录下的所有文件（除了.dockerignore 排除的路径），都拷贝进入 image 文件的/app 目录。
- WORKDIR /app：指定接下来的工作路径为/app。
- RUN npm install：在/app 目录下，运行 npm install 命令安装依赖。注意，安装后所有的依赖，都将打包进入 image 文件。
- EXPOSE 3000：将容器 3000 端口暴露出来， 允许外部连接这个端口。

#### 镜像发布

```bash
# 登录
docker login

# 构建
docker image build -t [username]/[repository]:[tag]

# 发布
docker image push [username]/[repository]:[tag]
```

### 参考链接

[docker centos 安装 ](https://docs.docker.com/install/linux/docker-ce/centos/)

[docker 使用 ](https://www.ruanyifeng.com/blog/2018/02/docker-tutorial.html)
