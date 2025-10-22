---
sidebar_position: 1
---

# How to Contribute

Thank you for your interest in contributing to our project! This guide will walk you through the process of making meaningful contributions.

## 🌟 Ways to Contribute

There are many ways to contribute, and we welcome contributions of all kinds:

### 📝 Documentation
- **Improve existing docs** - Fix typos, clarify explanations, add examples
- **Write new content** - Create tutorials, guides, and how-to articles
- **Translate content** - Help make docs available in more languages
- **Review documentation** - Suggest improvements and identify gaps

### 💻 Code Contributions
- **Fix bugs** - Help resolve reported issues
- **Add features** - Implement new functionality
- **Improve performance** - Optimize existing code
- **Enhance accessibility** - Make the project more inclusive
- **Write tests** - Increase code coverage and reliability

### 🎨 Design & User Experience
- **UI/UX improvements** - Enhance the user interface and experience
- **Create visual assets** - Design icons, illustrations, and graphics
- **Improve styling** - Enhance CSS and component design
- **Conduct user research** - Help us understand user needs

### 🐛 Quality Assurance
- **Report bugs** - Help us identify and fix issues
- **Test features** - Verify new functionality works correctly
- **Write test cases** - Create automated tests
- **Review pull requests** - Help maintain code quality

### 🤝 Community Support
- **Help other users** - Answer questions in discussions and forums
- **Create examples** - Share real-world implementations
- **Write blog posts** - Share your experience using the project
- **Speak at events** - Present about the project at meetups and conferences

## 🚀 Getting Started

### 1. Set Up Your Development Environment

**Prerequisites:**
- Node.js 16.14 or later
- Git
- A code editor (VS Code recommended)

**Setup Steps:**

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/docs-website-tmpl.git
   cd docs-website-tmpl
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/yuluo-yx/docs-website-tmpl.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start development server:**
   ```bash
   npm start
   ```

6. **Verify setup** - Open http://localhost:3000 and confirm the site loads

### 2. Understanding the Project Structure

```
docs-website-tmpl/
├── docs/                    # Documentation content
├── blog/                    # Blog posts
├── src/
│   ├── components/         # React components
│   ├── css/               # Custom styles
│   └── pages/             # Custom pages
├── static/                # Static assets
├── i18n/                  # Internationalization files
├── docusaurus.config.ts   # Main configuration
├── project.config.ts      # Project-specific settings
└── sidebars.ts           # Documentation sidebar
```

### 3. Making Your First Contribution

**For Documentation:**

1. Navigate to the `docs/` directory
2. Edit existing `.md` files or create new ones
3. Follow our [style guide](#writing-style-guide)
4. Test locally to ensure formatting is correct

**For Code:**

1. Check existing issues or create a new one
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Test thoroughly
5. Follow our coding standards (see below)

### 4. Testing Your Changes

**Local Testing:**
```bash
# Start development server
npm start

# Run linting
npm run lint

# Build for production
npm run build

# Serve built site
npm run serve
```

**Multi-language Testing:**
```bash
# Test English version
npm run start:en

# Test Chinese version
npm run start:zh

# Build all languages
npm run build
```

## 📋 Contribution Guidelines

### Writing Style Guide

**For Documentation:**

- **Be clear and concise** - Use simple language and short sentences
- **Use active voice** - "Click the button" instead of "The button should be clicked"
- **Include examples** - Show, don't just tell
- **Structure content** - Use headings, lists, and code blocks appropriately
- **Be inclusive** - Use gender-neutral language and avoid assumptions

**Example of good documentation:**

```markdown
# Getting Started

Follow these steps to install and run the project:

## Installation

1. **Install Node.js** (version 16.14 or later)
2. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo.git
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Project

Start the development server:

```bash
npm start
```

The site will open at http://localhost:3000.
```

### Coding Standards

**JavaScript/TypeScript:**
- Use TypeScript for new code
- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

**React Components:**
- Use functional components with hooks
- Follow component naming conventions
- Add PropTypes or TypeScript interfaces
- Keep components focused on single responsibility

**CSS:**
- Use CSS Modules for component styles
- Follow BEM naming convention when appropriate
- Use CSS variables for theming
- Ensure responsive design

**Example of good code:**

```tsx
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onEdit: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <div className={styles.userCard}>
      <h3 className={styles.userName}>{user.name}</h3>
      <p className={styles.userEmail}>{user.email}</p>
      <button 
        className={styles.editButton}
        onClick={() => onEdit(user.id)}
      >
        Edit User
      </button>
    </div>
  );
};
```

### Commit Message Format

Use the conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(search): add multi-language search support

fix(navbar): resolve mobile menu close button issue

docs(api): add authentication examples

style(homepage): improve responsive design
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update from main branch:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run tests and checks:**
   ```bash
   npm run lint
   npm run build
   npm run typecheck
   ```

3. **Update documentation** if your changes affect user-facing functionality

### Creating a Pull Request

1. **Push your branch:**
   ```bash
   git push origin your-feature-branch
   ```

2. **Create PR** on GitHub with:
   - **Clear title** describing the change
   - **Detailed description** explaining what and why
   - **Screenshots** for UI changes
   - **Testing steps** for reviewers
   - **Related issues** (use "Fixes #123" to auto-close issues)

### PR Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Style/formatting change
- [ ] Other (please describe)

## Testing
- [ ] Local testing completed
- [ ] Multi-language testing (if applicable)
- [ ] Responsive design tested
- [ ] Accessibility tested

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Fixes #123

## Additional Notes
Any additional context or information.
```

### Review Process

1. **Automatic checks** will run (linting, building)
2. **Maintainers will review** your code
3. **Address feedback** by making additional commits
4. **Approval and merge** once everything looks good

## 🎯 Issue Guidelines

### Reporting Bugs

Use our bug report template:

```markdown
## Bug Description
Clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should have happened.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Node.js version: [e.g., 18.0.0]
- Project version: [e.g., 1.2.3]

## Additional Context
Screenshots, error messages, etc.
```

### Feature Requests

Before submitting a feature request:

1. **Search existing issues** to avoid duplicates
2. **Explain the use case** and why it's needed
3. **Provide examples** of how it would be used
4. **Consider implementation** if you're willing to contribute

## 🏆 Recognition

We value all contributions and recognize contributors:

- **Contributors list** in README and documentation
- **Release notes** highlight significant contributions
- **Special thanks** in project announcements
- **Maintainer invitation** for long-term contributors

## 📞 Getting Help

If you need help with contributing:

- 💬 **[GitHub Discussions](https://github.com/yuluo-yx/docs-website-tmpl/discussions)** - Ask questions and discuss ideas
- 🐛 **[GitHub Issues](https://github.com/yuluo-yx/docs-website-tmpl/issues)** - Report bugs and request features
- 📧 **Email maintainers** for private concerns
- 💭 **[Community Discord](https://discord.gg/your-invite)** - Real-time chat with other contributors

## 🎉 Thank You!

Your contributions make this project better for everyone. Whether you're fixing a typo, adding a feature, or helping other users, every contribution matters.

Ready to contribute? Check out our [good first issues](https://github.com/yuluo-yx/docs-website-tmpl/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) to get started!

---

## Quick Links

- [Project Repository](https://github.com/yuluo-yx/docs-website-tmpl)
- [Issue Tracker](https://github.com/yuluo-yx/docs-website-tmpl/issues)
- [Discussions](https://github.com/yuluo-yx/docs-website-tmpl/discussions)
- [License](https://github.com/yuluo-yx/docs-website-tmpl/blob/main/LICENSE)

Happy contributing! 🚀
