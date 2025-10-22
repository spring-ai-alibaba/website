# 基础使用示例

通过这些基础使用示例快速开始。

## 快速开始示例

```javascript
// 导入库
import { Client } from 'our-library';

// 初始化客户端
const client = new Client({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com/v1'
});

// 进行第一次 API 调用
async function example() {
  try {
    const result = await client.getData();
    console.log('成功:', result);
  } catch (error) {
    console.error('错误:', error);
  }
}

example();
```

## 配置示例

```javascript
// 高级配置
const client = new Client({
  apiKey: process.env.API_KEY,
  baseUrl: 'https://api.example.com/v1',
  timeout: 10000,
  retries: 3,
  logging: true
});
```

## 数据获取示例

### 获取单个项目
```javascript
const item = await client.getItem('item-id-123');
console.log(item.title, item.content);
```

### 获取多个项目
```javascript
const items = await client.getItems({
  page: 1,
  limit: 20,
  sort: 'created_at',
  order: 'desc'
});

items.data.forEach(item => {
  console.log(`${item.id}: ${item.title}`);
});
```

### 搜索项目
```javascript
const searchResults = await client.searchItems({
  query: 'hello world',
  fields: ['title', 'content'],
  limit: 10
});
```

## CRUD 操作

### 创建
```javascript
const newItem = await client.createItem({
  title: '我的新项目',
  content: '这是我的新项目的内容。',
  tags: ['示例', '演示']
});
```

### 更新
```javascript
const updatedItem = await client.updateItem('item-id-123', {
  title: '更新的标题',
  content: '更新的内容'
});
```

### 删除
```javascript
const deleted = await client.deleteItem('item-id-123');
if (deleted) {
  console.log('项目删除成功');
}
```

## 错误处理

```javascript
async function handleErrors() {
  try {
    const result = await client.getData();
    return result;
  } catch (error) {
    if (error.status === 401) {
      console.error('身份验证失败');
      // 处理身份验证错误
    } else if (error.status === 429) {
      console.error('超出速率限制');
      // 处理速率限制
    } else {
      console.error('意外错误:', error.message);
      // 处理其他错误
    }
    throw error;
  }
}
```

## React 示例

```jsx
import React, { useState, useEffect } from 'react';
import { Client } from 'our-library';

const client = new Client({ apiKey: process.env.REACT_APP_API_KEY });

function DataComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await client.getData();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h2>数据项目</h2>
      <ul>
        {data.map(item => (
          <li key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DataComponent;
```

## Node.js 服务器示例

```javascript
const express = require('express');
const { Client } = require('our-library');

const app = express();
const client = new Client({ apiKey: process.env.API_KEY });

app.use(express.json());

// 代理端点
app.get('/api/data', async (req, res) => {
  try {
    const data = await client.getData(req.query);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message
    });
  }
});

// 创建端点
app.post('/api/data', async (req, res) => {
  try {
    const newItem = await client.createItem(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});
```

## 下一步

现在已经了解了基本使用方法：

1. 查看 [配置](/docs/getting-started/configuration) 了解高级设置
2. 探索 [API 文档](/docs/api/overview) 获取完整参考
3. 了解 [故障排除](/docs/troubleshooting/common-issues) 常见问题
