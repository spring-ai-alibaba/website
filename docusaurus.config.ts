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
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Metadata for SEO
  headTags: [
    // Basic SEO
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: projectConfig.description,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'Spring AI Alibaba, Agent Framework, ReactAgent, Graph, Multi-Agent, Java AI, 智能体, 通义千问, DashScope, AI应用开发, LangChain Java, AI Agent开发, 阿里云AI, 百炼大模型',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: projectConfig.author.name,
      },
    },
    // Open Graph / Facebook
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:url',
        content: projectConfig.deployment.url,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:title',
        content: 'Spring AI Alibaba - Agentic AI Framework for Java Developers',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content: projectConfig.description,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image',
        content: `${projectConfig.deployment.url}/img/social-card.jpg`,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:site_name',
        content: 'Spring AI Alibaba',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:locale',
        content: 'zh_CN',
      },
    },
    // Twitter
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:title',
        content: 'Spring AI Alibaba - Agentic AI Framework for Java Developers',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:description',
        content: projectConfig.description,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:image',
        content: `${projectConfig.deployment.url}/img/social-card.jpg`,
      },
    },
    // Additional SEO tags
    {
      tagName: 'meta',
      attributes: {
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'googlebot',
        content: 'index, follow',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'bingbot',
        content: 'index, follow',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        httpEquiv: 'Content-Type',
        content: 'text/html; charset=utf-8',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
    },
    // Schema.org structured data
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Spring AI Alibaba',
        url: projectConfig.deployment.url,
        logo: `${projectConfig.deployment.url}/img/logo.svg`,
        description: projectConfig.description,
        sameAs: [
          `https://github.com/${projectConfig.github.username}/${projectConfig.github.repoName}`,
        ],
      }),
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Spring AI Alibaba',
        url: projectConfig.deployment.url,
        description: projectConfig.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${projectConfig.deployment.url}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }),
    },
  ],

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
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'agents',
        path: 'agents-docs',
        routeBasePath: 'agents',
        sidebarPath: './sidebars/sidebars-agents.ts',
        editUrl: githubUrls.editDocs,
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
        breadcrumbs: true,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'ecosystem',
        path: 'ecosystem',
        routeBasePath: 'ecosystem',
        sidebarPath: './sidebars/sidebars-ecosystem.ts',
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
        breadcrumbs: true,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'integration',
        path: 'integration',
        routeBasePath: 'integration',
        sidebarPath: './sidebars/sidebars-integration.ts',
        editUrl: githubUrls.editDocs,
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
        breadcrumbs: true,
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
          // Enhanced SEO for docs
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          breadcrumbs: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
            title: 'Spring AI Alibaba Blog',
            description: 'Spring AI Alibaba 官方博客 - Java AI 开发框架最新动态、技术文章和最佳实践',
            copyright: `版权所有 © ${new Date().getFullYear()} ${projectConfig.author.name}`,
            language: 'zh-CN',
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: githubUrls.editBlog,
          blogTitle: 'Spring AI Alibaba Blog',
          blogDescription: 'Spring AI Alibaba 官方博客 - 分享 AI Agent 开发技术、最佳实践和行业洞察',
          blogSidebarTitle: '最新文章',
          blogSidebarCount: 'ALL',
          postsPerPage: 10,
          blogListComponent: '@theme/BlogListPage',
          blogPostComponent: '@theme/BlogPostPage',
          blogTagsListComponent: '@theme/BlogTagsListPage',
          blogTagsPostsComponent: '@theme/BlogTagsPostsPage',
        },
        theme: {
          customCss: ['./src/css/custom.css', './src/css/blog.css', './src/css/image-zoom.css'],
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
        // Performance optimizations
        gtag: undefined, // Disable if not using Google Analytics
      } satisfies PresetClassicOptions,
    ],
  ],
  
  themeConfig: {
    // Replace with your project's social card
    image: 'img/social-card.jpg',
    // Enhanced metadata for SEO
    metadata: [
      { name: 'keywords', content: 'Spring AI Alibaba, Agent Framework, ReactAgent, Graph, Multi-Agent, Java AI, 智能体, AI开发框架' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:type', content: 'website' },
    ],
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
          sidebarId: 'integrationSidebar',
          docsPluginId: 'integration',
          position: 'left',
          label: '生态集成',
        },
        {
          type: 'docSidebar',
          sidebarId: 'ecosystemSidebar',
          docsPluginId: 'ecosystem',
          position: 'left',
          label: 'Admin',
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
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
  } satisfies ThemeConfig,
}

export default config
