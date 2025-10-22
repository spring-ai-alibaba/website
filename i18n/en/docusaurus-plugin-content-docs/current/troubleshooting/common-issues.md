---
sidebar_position: 1
---

# Common Issues

Find solutions to frequently encountered problems and troubleshooting tips.

## Installation Issues

### Node.js Version Problems

**Problem:** Getting errors about Node.js version compatibility.

**Solution:**
1. Check your Node.js version:
   ```bash
   node --version
   ```
2. Ensure you're using Node.js 16.14 or later
3. Update Node.js if needed:
   ```bash
   # Using nvm
   nvm install --lts
   nvm use --lts
   ```

### Package Installation Failures

**Problem:** `npm install` fails with permission or network errors.

**Solutions:**

**For Permission Errors:**
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Or use npx instead of global installs
npx create-docusaurus@latest my-website classic
```

**For Network Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Use different registry
npm install --registry https://registry.npmjs.org/

# Increase timeout
npm install --timeout 60000
```

### Dependency Conflicts

**Problem:** Conflicting package versions causing build errors.

**Solution:**
```bash
# Clear everything and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Or try yarn
rm -rf node_modules yarn.lock
yarn install
```

## Development Server Issues

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Use a different port
npm start -- --port 3001

# Or kill the process using port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Hot Reload Not Working

**Problem:** Changes aren't reflected automatically in the browser.

**Solutions:**

1. **Check file watchers limit (Linux):**
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
   - Clear Docusaurus cache: `npm run clear`

3. **Restart development server:**
   ```bash
   npm run clear
   npm start
   ```

### Memory Issues

**Problem:** Build process runs out of memory.

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=4096"
npm run build

# Or add to package.json scripts:
"build": "NODE_OPTIONS='--max_old_space_size=4096' docusaurus build"
```

## Build and Deployment Issues

### Build Failures

**Problem:** `npm run build` fails with various errors.

**Common Solutions:**

1. **Clear cache and rebuild:**
   ```bash
   npm run clear
   npm run build
   ```

2. **Check for broken links:**
   - Review console output for broken internal links
   - Fix or remove broken references
   - Update `docusaurus.config.js` to handle broken links:
   ```javascript
   module.exports = {
     onBrokenLinks: 'warn', // or 'ignore' for development
   };
   ```

3. **Memory issues during build:**
   ```bash
   NODE_OPTIONS="--max_old_space_size=4096" npm run build
   ```

### Deployment Problems

**Problem:** Site doesn't work correctly after deployment.

**Solutions:**

1. **Check base URL configuration:**
   ```javascript
   // docusaurus.config.js
   module.exports = {
     url: 'https://username.github.io',
     baseUrl: '/repository-name/', // Important for GitHub Pages
   };
   ```

2. **Assets not loading:**
   - Verify `baseUrl` is correct
   - Check if files exist in build output
   - Ensure HTTPS/HTTP configuration matches hosting

3. **404 errors on page refresh:**
   - Configure server to serve `index.html` for all routes
   - For Netlify, add `_redirects` file:
   ```
   /*    /index.html   200
   ```

## API Integration Issues

### Authentication Errors

**Problem:** Getting 401 or 403 errors when calling the API.

**Solutions:**

1. **Check API key format:**
   ```javascript
   // Correct format
   'Authorization': 'Bearer sk_test_1234567890'
   
   // Common mistake - missing Bearer prefix
   'Authorization': 'sk_test_1234567890' // ❌ Wrong
   ```

2. **Verify API key permissions:**
   - Check your dashboard for key permissions
   - Ensure key hasn't expired
   - Try creating a new API key

3. **CORS issues in browser:**
   ```javascript
   // Use a proxy or server-side API calls
   // Add to package.json for development:
   "proxy": "https://api.your-project.com"
   ```

### Rate Limiting

**Problem:** Getting 429 "Too Many Requests" errors.

**Solution:**
```javascript
// Implement exponential backoff
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const delay = resetTime ? (resetTime * 1000) - Date.now() : Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### Network Connectivity

**Problem:** Requests failing due to network issues.

**Solutions:**

1. **Check API status:**
   - Visit [status page](https://status.your-project.com)
   - Check social media for outage reports

2. **Network debugging:**
   ```bash
   # Test API connectivity
   curl -I https://api.your-project.com/v1/health
   
   # Check DNS resolution
   nslookup api.your-project.com
   ```

3. **Firewall/Proxy issues:**
   - Check corporate firewall settings
   - Try from different network
   - Contact IT if needed

## Search Issues

### Search Not Working

**Problem:** Search functionality is not working or returning no results.

**Solutions:**

1. **Rebuild search index:**
   ```bash
   npm run clear
   npm run build
   ```

2. **Check search plugin configuration:**
   ```javascript
   // docusaurus.config.js
   plugins: [
     [
       require.resolve("@easyops-cn/docusaurus-search-local"),
       {
         hashed: true,
         language: ["en", "zh"],
         highlightSearchTermsOnTargetPage: true,
       },
     ],
   ],
   ```

3. **Verify search files are generated:**
   - Check `build/` directory for search index files
   - Look for `.json` files with search data

### Search Results Not Accurate

**Problem:** Search returns irrelevant or outdated results.

**Solutions:**

1. **Clear and rebuild:**
   ```bash
   npm run clear
   npm run build
   ```

2. **Check document metadata:**
   - Ensure proper frontmatter in markdown files
   - Add relevant keywords and descriptions

3. **Customize search configuration:**
   ```javascript
   // Adjust search plugin settings
   {
     indexDocs: true,
     indexBlog: true,
     indexPages: true,
     removeDefaultStopWordFilter: false,
   }
   ```

## Multi-language Issues

### Language Switching Problems

**Problem:** Language switcher not appearing or not working.

**Solutions:**

1. **Check i18n configuration:**
   ```javascript
   // docusaurus.config.js
   module.exports = {
     i18n: {
       defaultLocale: 'en',
       locales: ['en', 'zh-Hans'],
     },
   };
   ```

2. **Verify translation files exist:**
   ```bash
   # Check for translation directories
   ls -la i18n/
   ls -la i18n/zh-Hans/
   ```

3. **Add locale dropdown to navbar:**
   ```javascript
   // docusaurus.config.js
   themeConfig: {
     navbar: {
       items: [
         {
           type: 'localeDropdown',
           position: 'right',
         },
       ],
     },
   },
   ```

### Missing Translations

**Problem:** Some content still appears in the original language.

**Solutions:**

1. **Generate translation files:**
   ```bash
   npm run write-translations
   ```

2. **Check translation coverage:**
   - Review `i18n/` directory structure
   - Ensure all required files are translated
   - Check for missing translation keys

3. **Update translation files:**
   ```bash
   # Regenerate after code changes
   npm run write-translations
   # Edit the generated files in i18n/[locale]/
   ```

## Performance Issues

### Slow Build Times

**Problem:** Build process takes very long to complete.

**Solutions:**

1. **Enable build caching:**
   ```javascript
   // docusaurus.config.js
   module.exports = {
     future: {
       experimental_faster: true,
     },
   };
   ```

2. **Optimize images:**
   - Compress images before adding to `static/`
   - Use appropriate image formats (WebP, AVIF)
   - Consider lazy loading for large images

3. **Reduce bundle size:**
   ```bash
   # Analyze bundle size
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

### Slow Page Loading

**Problem:** Website loads slowly for users.

**Solutions:**

1. **Optimize assets:**
   - Compress images
   - Minify CSS/JS (usually automatic)
   - Enable compression on hosting

2. **Use CDN:**
   - Host static assets on CDN
   - Enable CDN on hosting platform

3. **Lazy load content:**
   ```javascript
   // Use dynamic imports for heavy components
   const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
   ```

## Getting Help

If you're still having issues:

1. **Check the logs:**
   - Look at console output for detailed error messages
   - Check browser developer tools console
   - Review server logs if deployed

2. **Search existing issues:**
   - [Docusaurus GitHub Issues](https://github.com/facebook/docusaurus/issues)
   - [Our project issues](https://github.com/your-username/your-project/issues)

3. **Ask for help:**
   - 💬 [Community forum](https://community.your-project.com)
   - 📧 [Email support](mailto:support@your-project.com)
   - 🐛 [Report bugs](https://github.com/your-username/your-project/issues/new)

4. **Provide useful information:**
   - Error messages (full stack trace)
   - Steps to reproduce
   - Environment details (OS, Node.js version, browser)
   - Configuration files (sanitized)

## Common Error Messages

### "Module not found"

**Error:** `Module not found: Can't resolve 'some-module'`

**Solution:**
```bash
# Install missing dependency
npm install some-module

# Or if it's a dev dependency
npm install --save-dev some-module

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Cannot read property of undefined"

**Error:** Runtime errors about undefined properties.

**Solutions:**
- Check for typos in property names
- Add null checks or default values
- Verify data structure matches expectations

### "Hydration failed"

**Error:** React hydration mismatches between server and client.

**Solutions:**
- Ensure server and client render the same content
- Check for browser-only code running on server
- Use `useEffect` for browser-specific logic

Remember: When in doubt, try clearing cache and rebuilding! Many issues are resolved by:

```bash
npm run clear
rm -rf node_modules package-lock.json
npm install
npm run build
```
