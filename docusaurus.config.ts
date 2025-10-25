import type { Config } from '@docusaurus/types'
import type { Options as PresetClassicOptions, ThemeConfig } from '@docusaurus/preset-classic'
import { themes } from 'prism-react-renderer'
import projectConfig, { getGitHubUrls, getAuthorInfo } from './project.config'

const lightCodeTheme = themes.github
const darkCodeTheme = themes.vsDark

// Generate GitHub links from project configuration
const githubUrls = getGitHubUrls(projectConfig)
// If needed, get author information
const authorInfo = getAuthorInfo(projectConfig)

const config: Config = {
  title: projectConfig.title,
  tagline: projectConfig.tagline,
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: projectConfig.deployment.url,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: projectConfig.deployment.baseUrl,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: projectConfig.github.username, // Replace with your GitHub username or organization name
  projectName: projectConfig.github.repoName, // Replace with your repository name

  // check links and markdown links
  // if the link is broken, it will throw an error during build
  // if the markdown link is broken, it will show a warning during build
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans', 'en'],
    localeConfigs: {
      'zh-Hans': {
        label: '简体中文',
        direction: 'ltr',
        htmlLang: 'zh-CN',
      },
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
      },
    },
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  plugins: [],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: githubUrls.editDocs,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: githubUrls.editBlog,
        },
        theme: {
          customCss: ['./src/css/custom.css', './src/css/blog.css'],
        },
      } satisfies PresetClassicOptions,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/social-card.jpg',
    // Disable search functionality
    algolia: undefined,
    navbar: {
      title: projectConfig.title,
      logo: {
        alt: `${projectConfig.title} Logo`,
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      hideOnScroll: false,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: '文档',
        },
        {
          to: '/blog',
          label: '博客',
          position: 'left',
        },
        {
          type: 'dropdown',
          label: '社区',
          position: 'left',
          items: [
            {
              label: '团队',
              to: '/community/team',
            },
            {
              label: '贡献指南',
              to: '/community/contributing',
            },
            {
              label: '行为准则',
              to: '/community/code-of-conduct',
            },
            {
              type: 'html',
              value: '<hr style="margin: 0.3rem 0;">',
            },
            {
              label: 'GitHub 讨论',
              href: githubUrls.discussions,
            },
            {
              label: 'GitHub 问题',
              href: githubUrls.issues,
            },
          ],
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: githubUrls.repo,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '快速开始',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: '开发框架',
          items: [
            {
              label: 'Agent Framework',
              to: '/docs/frameworks/agent-framework/quick-start',
            },
            {
              label: 'Graph Core',
              to: '/docs/frameworks/graph-core/quick-start',
            },
            {
              label: 'Admin',
              to: '/docs/frameworks/admin/quick-start',
            },
            {
              label: 'Extensions',
              to: '/docs/frameworks/extensions/quick-start',
            },
          ],
        },
        {
          title: '智能体',
          items: [
            {
              label: 'DataAgent',
              to: '/docs/agents/dataagent/quick-start',
            },
            {
              label: 'JManus',
              to: '/docs/agents/jmanus/quick-start',
            },
            {
              label: 'DeepResearch',
              to: '/docs/agents/deepresearch/quick-start',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub',
              href: githubUrls.repo,
            },
            {
              label: '讨论',
              href: githubUrls.discussions,
            },
            {
              label: '贡献',
              href: githubUrls.contributing,
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '许可证',
              href: githubUrls.license,
            },
            {
              label: '博客',
              to: '/blog',
            },
            {
              label: '团队',
              to: '/community/team',
            },
          ],
        },
      ],
      copyright: `版权所有 © ${new Date().getFullYear()} ${projectConfig.author.name}。使用 Docusaurus 构建。`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
      additionalLanguages: ['bash', 'json', 'yaml', 'go', 'rust', 'python', 'javascript', 'typescript'],
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
  } satisfies ThemeConfig,
}

export default config
