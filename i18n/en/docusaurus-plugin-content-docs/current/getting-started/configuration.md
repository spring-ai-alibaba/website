---
sidebar_position: 3
---

# Configuration

Learn how to configure your project to suit your needs.

## Basic Configuration

The main configuration file is `docusaurus.config.js` in your project root.

### Site Metadata

```javascript
module.exports = {
  title: 'My Documentation Site',
  tagline: 'Building amazing documentation',
  url: 'https://mydocs.com',
  baseUrl: '/',
  
  // SEO and metadata
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
};
```

### Theme Configuration

```javascript
module.exports = {
  themeConfig: {
    navbar: {
      title: 'My Site',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left'
        },
      ],
    },
    footer: {
      // Footer configuration
    },
  },
};
```

## Advanced Configuration

### Custom CSS

Add your custom styles in `src/css/custom.css`:

```css
/* Custom color scheme */
:root {
  --ifm-color-primary: #25c2a0;
  --ifm-color-primary-dark: #21af90;
  --ifm-color-primary-darker: #1fa588;
  --ifm-color-primary-darkest: #1a8870;
}
```

### Plugin Configuration

Enable additional plugins:

```javascript
module.exports = {
  plugins: [
    [
      '@docusaurus/plugin-google-analytics',
      {
        trackingID: 'UA-YOUR-TRACKING-ID',
      },
    ],
  ],
};
```

### Environment Variables

Create a `.env` file for sensitive configuration:

```bash
GITHUB_TOKEN=your_github_token
API_URL=https://api.example.com
```

Use in your config:

```javascript
module.exports = {
  customFields: {
    apiUrl: process.env.API_URL,
  },
};
```

## Sidebar Configuration

Edit `sidebars.js` to organize your documentation:

```javascript
module.exports = {
  tutorialSidebar: [
    'intro',
    'getting-started/installation',
    'getting-started/quickstart',
    {
      type: 'category',
      label: 'API Reference',
      items: ['api/overview', 'api/authentication'],
    },
  ],
};
```

## Deployment Configuration

### GitHub Pages

```javascript
module.exports = {
  url: 'https://username.github.io',
  baseUrl: '/project-name/',
  organizationName: 'username',
  projectName: 'project-name',
  deploymentBranch: 'gh-pages',
};
```

### Netlify

Add a `netlify.toml` file:

```toml
[build]
  command = "npm run build"
  publish = "build/"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Custom Domain

```javascript
module.exports = {
  url: 'https://mydocs.com',
  baseUrl: '/',
  // Add CNAME file for custom domain
  staticDirectories: ['static'],
};
```

Create `static/CNAME`:
```
mydocs.com
```

## Best Practices

1. **Version Control**: Keep your config in version control
2. **Environment Specific**: Use environment variables for sensitive data
3. **Documentation**: Comment your configuration choices
4. **Testing**: Test configuration changes in development
5. **Backup**: Keep backup of working configurations

## Common Configuration Patterns

### Multi-language Setup

```javascript
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
  },
};
```

### Search Integration

```javascript
module.exports = {
  themes: ['@docusaurus/theme-search-algolia'],
  themeConfig: {
    algolia: {
      apiKey: 'your-api-key',
      indexName: 'your-index-name',
      appId: 'your-app-id',
    },
  },
};
```

## Troubleshooting Configuration

### Configuration Validation

Run this command to validate your configuration:

```bash
npm run docusaurus -- --help
```

### Common Issues

- **Build failures**: Check for syntax errors in config files
- **Broken links**: Verify all referenced paths exist
- **Plugin conflicts**: Check plugin compatibility and versions
- **Theme issues**: Ensure theme configurations match plugin versions

Need help? Check our [troubleshooting guide](../troubleshooting/common-issues) or ask in our community forums.