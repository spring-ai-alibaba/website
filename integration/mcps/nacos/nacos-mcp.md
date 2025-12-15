# Nacos 的 mcp 配置

## 安装

nacos 下载页面：[Nacos Server 下载页面](https://nacos.io/download/nacos-server/?spm=5238cd80.2ef5001f.0.0.3f613b7cz5Lc7o)

![nacos-html.png](/img/blog/extensions/mcp/nacos-html.png)

选择下载最新的 3.1.0+ 版本，质量选择二进制包下载

## 基础配置

下载完后，在 nacos/conf/application.properties 文件中调整三个参数配置，用来实现对应的鉴权功能

```java
nacos.core.auth.server.identity.key=yingzi
nacos.core.auth.server.identity.value=yingzi
nacos.core.auth.plugin.nacos.token.secret.key=VGhpc0lzTXlDdXN0b21TZWNyZXRLZXkwMTIzNDU2Nzg=
```

![nacos-start.png](/img/blog/extensions/mcp/nacos-start.png)

项目启动：cd 到 nacos/bin 目录下，这里以单机模式启动

```bash
sh startup.sh -m standalone
```

页面：[http://127.0.0.1/index.html](http://127.0.0.1:8080/index.html)

- 首次登录，需要为账号 nacos，设置初始密码

![nacos-login.png](/img/blog/extensions/mcp/nacos-login.png)

## 界面说明

1. 可以为 MCP 单独建立一个命名空间
2. MCP 管理下的 MCP 列表，记录了注册上来的 MCP 服务信息

![nacos-desc.png](/img/blog/extensions/mcp/nacos-desc.png)

后续都以 public-mcp 为基准，记住对应的命名空间 ID 为：0908ca08-c382-404c-9d96-37fe1628b183

有关 mcp 相关的配置信息可在配置管理/配置列表中查看

![nacos-mcp-confog.png](/img/blog/extensions/mcp/nacos-mcp-confog.png)
