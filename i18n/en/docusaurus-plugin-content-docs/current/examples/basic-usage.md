# Basic Usage Examples

Get started quickly with these basic usage examples.

## Quick Start Example

```javascript
// Import the library
import { Client } from 'our-library';

// Initialize the client
const client = new Client({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com/v1'
});

// Make your first API call
async function example() {
  try {
    const result = await client.getData();
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## Configuration Example

```javascript
// Advanced configuration
const client = new Client({
  apiKey: process.env.API_KEY,
  baseUrl: 'https://api.example.com/v1',
  timeout: 10000,
  retries: 3,
  logging: true
});
```

## Data Fetching Examples

### Get Single Item
```javascript
const item = await client.getItem('item-id-123');
console.log(item.title, item.content);
```

### Get Multiple Items
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

### Search Items
```javascript
const searchResults = await client.searchItems({
  query: 'hello world',
  fields: ['title', 'content'],
  limit: 10
});
```

## CRUD Operations

### Create
```javascript
const newItem = await client.createItem({
  title: 'My New Item',
  content: 'This is the content of my new item.',
  tags: ['example', 'demo']
});
```

### Update
```javascript
const updatedItem = await client.updateItem('item-id-123', {
  title: 'Updated Title',
  content: 'Updated content'
});
```

### Delete
```javascript
const deleted = await client.deleteItem('item-id-123');
if (deleted) {
  console.log('Item deleted successfully');
}
```

## Error Handling

```javascript
async function handleErrors() {
  try {
    const result = await client.getData();
    return result;
  } catch (error) {
    if (error.status === 401) {
      console.error('Authentication failed');
      // Handle authentication error
    } else if (error.status === 429) {
      console.error('Rate limit exceeded');
      // Handle rate limiting
    } else {
      console.error('Unexpected error:', error.message);
      // Handle other errors
    }
    throw error;
  }
}
```

## React Example

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Data Items</h2>
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

## Node.js Server Example

```javascript
const express = require('express');
const { Client } = require('our-library');

const app = express();
const client = new Client({ apiKey: process.env.API_KEY });

app.use(express.json());

// Proxy endpoint
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

// Create endpoint
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
  console.log(`Server running on port ${port}`);
});
```

## Next Steps

Now that you understand the basics:

1. Check out [Configuration](/docs/getting-started/configuration) for advanced settings
2. Explore [API Documentation](/docs/api/overview) for complete reference
3. Learn about [Troubleshooting](/docs/troubleshooting/common-issues) common issues
