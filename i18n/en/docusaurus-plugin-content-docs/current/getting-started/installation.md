---
sidebar_position: 1
---

# Installation

Get started with our project by following this installation guide.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

- **Node.js** (version 16.14 or later)
- **npm** (comes with Node.js) or **yarn**
- **Git** for version control

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/your-project.git
cd your-project
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

### 3. Start Development Server

```bash
npm start
# or
yarn start
```

The website will automatically open at `http://localhost:3000`.

## Verify Installation

If everything is set up correctly, you should see:

1. The development server starts without errors
2. Your browser opens the project homepage
3. Hot reload works when you edit files

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Use a different port
npm start -- --port 3001
```

**Dependencies installation fails:**
```bash
# Clear npm cache
npm cache clean --force
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```bash
# Clear Docusaurus cache
npm run clear
npm run build
```

## Next Steps

Once installation is complete, check out:

- [Quick Start Guide](./quickstart) - Get up and running quickly
- [Configuration](./configuration) - Customize your setup
- [API Reference](../api/overview) - Explore available features