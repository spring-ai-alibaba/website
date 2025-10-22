---
sidebar_position: 2
---

# Quick Start

This guide will help you get started with your project in just a few minutes.

## Overview

Our project provides a complete solution for building documentation websites with modern features and beautiful design.

## Basic Usage

### 1. Initial Setup

After installation, your project structure should look like this:

```
your-project/
├── docs/           # Documentation pages
├── blog/           # Blog posts
├── src/            # Custom React components
├── static/         # Static assets
└── docusaurus.config.js
```

### 2. Create Your First Document

Create a new file in the `docs/` directory:

```markdown title="docs/my-first-doc.md"
---
sidebar_position: 1
---

# My First Document

This is my first document page.

## Hello World

Welcome to your documentation site!

### Features

- Easy to use
- Fast and responsive
- Beautiful themes
```

### 3. Add a Blog Post

Create a blog post in the `blog/` directory:

```markdown title="blog/2025-01-01-hello-world.md"
---
slug: hello-world
title: Hello World
authors: [your-name]
tags: [hello, docusaurus]
---

Welcome to my blog!

This is my first blog post.

<!--truncate-->

More content goes here...
```

### 4. Customize Your Site

Edit `docusaurus.config.js` to customize:

```javascript
module.exports = {
  title: 'My Site',
  tagline: 'Building amazing docs',
  url: 'https://my-site.com',
  // ... more configuration
};
```

## Development Workflow

### Writing Content

1. **Markdown Files**: Write content in Markdown format
2. **Front Matter**: Use YAML front matter for metadata
3. **Live Reload**: Changes appear instantly in development

### Project Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Serve built site locally  
npm run serve

# Deploy to hosting
npm run deploy
```

## What's Next?

Now that you have the basics running:

1. **Explore Features**: Check out all available [API endpoints](../api/overview)
2. **Customize**: Learn about [configuration options](./configuration)  
3. **Examples**: See [practical examples](../examples/basic-usage)
4. **Community**: Join our discussions and contribute

## Need Help?

- 📖 Read the full [documentation](../intro)
- 🐛 Report issues on [GitHub](https://github.com/your-username/your-project/issues)
- 💬 Ask questions in [Discussions](https://github.com/your-username/your-project/discussions)

Happy building! 🚀