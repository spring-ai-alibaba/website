import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: '快速开始',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      items: [
        'api/overview',
        'api/authentication',
      ],
    },
    {
      type: 'category',
      label: '使用示例',
      items: [
        'examples/basic-usage',
      ],
    },
    {
      type: 'category',
      label: '参与贡献',
      items: [
        'contributing/how-to-contribute',
      ],
    },
    {
      type: 'category',
      label: '问题排查',
      items: [
        'troubleshooting/common-issues',
      ],
    },
  ],
}

export default sidebars
