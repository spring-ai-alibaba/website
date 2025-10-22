# 身份验证

了解如何通过我们的 API 进行身份验证以访问受保护的资源。

## API 密钥

要使用我们的 API，需要获取一个 API 密钥：

1. 注册或登录账户
2. 导航到仪表板
3. 生成新的 API 密钥
4. 保持 API 密钥安全

### 认证方式

在请求标头中包含 API 密钥：

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.example.com/v1/data
```

## 身份验证方法

### Bearer Token
```javascript
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};
```

### 查询参数
```javascript
const url = 'https://api.example.com/v1/data?api_key=YOUR_API_KEY';
```

## 速率限制

- 免费版：1000 请求/小时
- 专业版：10000 请求/小时
- 企业版：自定义限制

## 安全最佳实践

- 永远不要在客户端代码中暴露 API 密钥
- 使用环境变量存储 API 密钥
- 定期轮换 API 密钥
- 监控 API 使用情况是否有异常活动

## 故障排除

常见的身份验证问题和解决方案：

- **401 未授权**：检查 API 密钥
- **403 禁止访问**：验证权限
- **429 请求过多**：已达到速率限制
