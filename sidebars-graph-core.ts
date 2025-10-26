import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  graphCoreSidebar: [
      {
        type: 'doc',
        id: 'quick-start',
        label: '快速开始',
      },
    {
      type: 'category',
      label: '核心概念',
      items: [
        'core-concepts/graph-basics',
        'core-concepts/nodes',
        'core-concepts/edges',
        'core-concepts/execution',
      ],
    },
    {
      type: 'category',
      label: '使用指南',
      items: [
        'guides/building-graphs',
        'guides/conditional-logic',
        'guides/state-management',
        'guides/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      items: [
        'api/graph-api',
        'api/node-api',
        'api/state-api',
      ],
    },
    {
      type: 'doc',
      id: 'troubleshooting',
      label: '故障排查',
    },
  ],
}

export default sidebars
