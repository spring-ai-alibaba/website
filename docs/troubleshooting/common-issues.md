# Common Issues

Solutions to frequently encountered problems.

## Installation Issues

### NPM Install Fails

**Problem:** `npm install` command fails with permission errors.

**Solution:**
```bash
# Option 1: Use npx
npx create-next-app@latest my-app

# Option 2: Fix npm permissions
sudo chown -R $(whoami) ~/.npm
npm cache clean --force

# Option 3: Use yarn instead
yarn install
```

### Missing Dependencies

**Problem:** Import errors for missing packages.

**Solution:**
```bash
# Install missing peer dependencies
npm install --save-dev @types/react @types/node

# Check for outdated packages
npm outdated

# Update packages
npm update
```

## Runtime Errors

### API Key Issues

**Problem:** 401 Unauthorized errors.

**Solutions:**
1. Verify your API key is correct
2. Check environment variables are loaded
3. Ensure API key has proper permissions

```javascript
// Debug API key loading
console.log('API Key loaded:', process.env.API_KEY ? 'Yes' : 'No');
```

### CORS Errors

**Problem:** Cross-origin request blocked.

**Solutions:**
1. Configure your server to allow CORS
2. Use a proxy in development
3. Make requests from the same domain

```javascript
// Next.js API route example
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Your API logic here
}
```

### Rate Limiting

**Problem:** 429 Too Many Requests errors.

**Solutions:**
1. Implement exponential backoff
2. Cache responses when possible
3. Reduce request frequency

```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

## Build Issues

### TypeScript Errors

**Problem:** Type checking fails during build.

**Solutions:**
1. Update TypeScript definitions
2. Fix type annotations
3. Use type assertions carefully

```typescript
// Fix common type issues
const data = response.data as ApiResponse;

// Or use type guards
function isApiResponse(data: any): data is ApiResponse {
  return data && typeof data.id === 'string';
}
```

### Environment Variables Not Found

**Problem:** Environment variables undefined in production.

**Solutions:**
1. Check variable names (case sensitive)
2. Restart development server after changes
3. Verify deployment platform configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
API_SECRET_KEY=your-secret-key

# Only NEXT_PUBLIC_ variables are available in browser
```

## Performance Issues

### Slow API Responses

**Solutions:**
1. Implement response caching
2. Use pagination for large datasets
3. Optimize API queries

```javascript
// React Query example for caching
import { useQuery } from 'react-query';

function useData() {
  return useQuery('data', fetchData, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### Memory Leaks

**Solutions:**
1. Clean up event listeners
2. Cancel pending requests
3. Use WeakMap for caching

```javascript
useEffect(() => {
  const controller = new AbortController();
  
  fetchData(controller.signal).catch(error => {
    if (error.name !== 'AbortError') {
      console.error('Fetch error:', error);
    }
  });
  
  return () => {
    controller.abort();
  };
}, []);
```

## Debugging Tips

### Enable Debug Logging

```javascript
// Enable detailed logging
const client = new Client({
  apiKey: 'your-key',
  debug: true,
  logLevel: 'debug'
});
```

### Network Issues

```bash
# Test API connectivity
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/v1/health

# Check DNS resolution
nslookup api.example.com

# Test with different HTTP client
wget --header="Authorization: Bearer YOUR_TOKEN" https://api.example.com/v1/data
```

### Browser DevTools

1. Open Network tab to inspect requests
2. Check Console for JavaScript errors
3. Use Application tab to verify localStorage/cookies
4. Profile performance with Performance tab

## Getting More Help

If these solutions don't resolve your issue:

1. Check our [GitHub Issues](https://github.com/example/repo/issues)
2. Join our [Discord Community](https://discord.gg/example)
3. Contact [Support](mailto:support@example.com)
4. Review [API Documentation](../api/overview.md)

When asking for help, please include:
- Error messages (full stack trace)
- Environment details (OS, Node.js version, etc.)
- Minimal code example that reproduces the issue
- Steps you've already tried
