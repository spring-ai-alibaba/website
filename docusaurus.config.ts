import type { Config } from '@docusaurus/types'
import type { Options as PresetClassicOptions, ThemeConfig } from '@docusaurus/preset-classic'
import { themes } from 'prism-react-renderer'
import projectConfig, { getGitHubUrls } from './project.config'

const lightCodeTheme = themes.github
const darkCodeTheme = themes.vsDark

// Generate GitHub links from project configuration
const githubUrls = getGitHubUrls(projectConfig)

const config: Config = {
  title: projectConfig.title,
  tagline: projectConfig.tagline,
  favicon: 'img/favicon.png',

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

  plugins: [
    // 旧版本文档插件 - 保留文件但不显示在导航栏
    // 用户仍可通过旧链接访问这些文档，避免404错误
    // 注意：请先将旧版本文档文件拷贝到 docs/1.0.0.2 目录后再启用此配置
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'docs-1_0_0_2',
        path: 'docs/1.0.0.2',
        routeBasePath: 'docs/1.0.0.2',
        // 不设置 sidebarPath，这样就不会在任何侧边栏显示
        // 但用户仍可通过直接访问 URL 来查看这些文档
        exclude: [], // 确保所有文档都可访问
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'agents',
        path: 'agents-docs',
        routeBasePath: 'agents',
        sidebarPath: './sidebars/sidebars-agents.ts',
        editUrl: githubUrls.editDocs,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'ecosystem',
        path: 'ecosystem',
        routeBasePath: 'ecosystem',
        sidebarPath: './sidebars/sidebars-ecosystem.ts',
      },
    ],
    // [
    //   '@docusaurus/plugin-content-docs',
    //   {
    //     id: 'studio',
    //     path: 'studio',
    //     routeBasePath: 'studio',
    //     sidebarPath: './sidebars/sidebars-studio.ts',
    //   },
    // ],
  ],

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
        src: 'img/logo-fullname.svg',
        srcDark: 'img/logo-fullname.svg',
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
          type: 'docSidebar',
          sidebarId: 'agentsSidebar',
          docsPluginId: 'agents',
          position: 'left',
          label: '智能体',
        },
        {
          type: 'docSidebar',
          sidebarId: 'ecosystemSidebar',
          docsPluginId: 'ecosystem',
          position: 'left',
          label: '生态',
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
              to: '/docs/overview',
            },
          ],
        },
        {
          title: '开发框架',
          items: [
            {
              label: 'Agent Framework',
              to: '/docs/quick-start',
            },
            {
              label: 'Graph Core',
              to: '/docs/frameworks/graph-core/quick-start',
            },
            {
              label: 'Admin',
              to: '/ecosystem/admin/quick-start',
            },
            {
              label: 'Spring AI',
              to: '/ecosystem/spring-ai/reference/concepts',
            },
          ],
        },
        {
          title: '智能体',
          items: [
            {
              label: 'DeepResearch',
              to: '/agents/deepresearch/quick-start',
            },
            {
              label: 'DataAgent',
              to: '/agents/dataagent/quick-start',
            },
            {
              label: 'JManus',
              to: '/agents/jmanus/quick-start',
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
      additionalLanguages: ['bash', 'json', 'yaml', 'go', 'rust', 'python', 'javascript', 'typescript', 'java', 'gradle'],
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
  } satisfies ThemeConfig,
}

export default config
