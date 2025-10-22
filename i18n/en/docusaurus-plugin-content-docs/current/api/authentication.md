---
sidebar_position: 2
---

# Authentication

Learn how to authenticate your API requests securely.

## Overview

Our API uses token-based authentication to ensure secure access to your data. All API requests must include a valid authentication token.

## API Keys

### Getting Your API Key

1. **Sign up** for an account at [your-project.com](https://your-project.com)
2. **Navigate** to your dashboard
3. **Go to** API Settings → API Keys
4. **Click** "Generate New API Key"
5. **Copy** your API key and store it securely

:::warning Security Notice
Keep your API keys secure and never expose them in client-side code or public repositories. Treat them like passwords!
:::

### API Key Types

We offer different types of API keys for different use cases:

| Type | Description | Permissions | Use Case |
|------|-------------|-------------|----------|
| **Development** | For testing and development | Read-only | Local development, testing |
| **Production** | For live applications | Full access | Production applications |
| **Limited** | Restricted access | Custom permissions | Third-party integrations |

## Authentication Methods

### Bearer Token (Recommended)

Include your API key in the `Authorization` header using the Bearer token format:

```http
Authorization: Bearer YOUR_API_KEY
```

**Example:**

```javascript
const response = await fetch('https://api.your-project.com/v1/data', {
  headers: {
    'Authorization': 'Bearer sk_test_1234567890abcdef',
    'Content-Type': 'application/json'
  }
});
```

### API Key Header

Alternatively, you can pass your API key in a custom header:

```http
X-API-Key: YOUR_API_KEY
```

**Example:**

```javascript
const response = await fetch('https://api.your-project.com/v1/data', {
  headers: {
    'X-API-Key': 'sk_test_1234567890abcdef',
    'Content-Type': 'application/json'
  }
});
```

## Authentication Examples

### JavaScript/Node.js

```javascript
// Using fetch with Bearer token
const apiKey = 'sk_test_1234567890abcdef';

async function makeApiRequest() {
  try {
    const response = await fetch('https://api.your-project.com/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
  }
}
```

### Python

```python
import requests

API_KEY = 'sk_test_1234567890abcdef'
BASE_URL = 'https://api.your-project.com/v1'

def make_api_request():
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f'{BASE_URL}/users', headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'API request failed: {e}')
        return None
```

### cURL

```bash
# Using Bearer token
curl -X GET "https://api.your-project.com/v1/users" \
  -H "Authorization: Bearer sk_test_1234567890abcdef" \
  -H "Content-Type: application/json"

# Using API key header
curl -X GET "https://api.your-project.com/v1/users" \
  -H "X-API-Key: sk_test_1234567890abcdef" \
  -H "Content-Type: application/json"
```

### PHP

```php
<?php
$apiKey = 'sk_test_1234567890abcdef';
$url = 'https://api.your-project.com/v1/users';

$headers = [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
];

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $url);
curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

if ($httpCode === 200) {
    $data = json_decode($response, true);
    print_r($data);
} else {
    echo "API request failed with status: " . $httpCode;
}

curl_close($curl);
?>
```

## Error Handling

### Authentication Errors

Common authentication errors and their solutions:

#### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

**Solutions:**
- Check that your API key is correct
- Ensure the `Authorization` header is properly formatted
- Verify your API key hasn't expired

#### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions for this resource"
  }
}
```

**Solutions:**
- Check if your API key has the required permissions
- Contact support to upgrade your access level

#### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

**Solutions:**
- Wait before making additional requests
- Implement exponential backoff in your code
- Consider upgrading your plan for higher rate limits

## Best Practices

### Security

1. **Never expose API keys** in client-side code or public repositories
2. **Use environment variables** to store API keys in your applications
3. **Rotate your API keys** regularly (at least every 90 days)
4. **Use different keys** for development and production environments
5. **Monitor API key usage** for suspicious activity

### Implementation

1. **Handle authentication errors gracefully** in your code
2. **Implement retry logic** with exponential backoff for rate limits
3. **Cache authentication tokens** when possible to reduce API calls
4. **Log authentication failures** for debugging purposes
5. **Use HTTPS only** for all API requests

### Environment Variables

Store your API keys securely using environment variables:

```bash
# .env file
API_KEY=sk_test_1234567890abcdef
API_BASE_URL=https://api.your-project.com/v1
```

```javascript
// In your application
const apiKey = process.env.API_KEY;
const baseUrl = process.env.API_BASE_URL;
```

## Testing Authentication

### Verify Your API Key

Test your authentication setup with this simple endpoint:

```http
GET /v1/auth/verify
```

**Example:**

```bash
curl -X GET "https://api.your-project.com/v1/auth/verify" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "key_id": "ak_1234567890",
    "permissions": ["read", "write"],
    "rate_limit": {
      "limit": 1000,
      "remaining": 999,
      "reset": 1640995200
    }
  }
}
```

## Managing API Keys

### Dashboard

Manage your API keys through the dashboard:

1. **View all keys** - See all your active API keys
2. **Create new keys** - Generate keys with specific permissions
3. **Revoke keys** - Immediately disable compromised keys
4. **Monitor usage** - Track API key usage and activity

### Programmatic Management

You can also manage API keys programmatically using our Management API:

```javascript
// Create a new API key
const newKey = await fetch('https://api.your-project.com/v1/auth/keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_MASTER_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Production Key',
    permissions: ['read', 'write']
  })
});
```

## Troubleshooting

If you're having authentication issues:

1. **Verify your API key format** - Should start with `sk_test_` or `sk_live_`
2. **Check the Authorization header** - Ensure proper Bearer format
3. **Test with cURL** - Isolate the issue from your application code
4. **Check our status page** - Verify our API services are operational
5. **Contact support** - We're here to help!

For more help, see our [troubleshooting guide](../troubleshooting/common-issues) or contact our support team.
