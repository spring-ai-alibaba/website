import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  agentFrameworkSidebar: [
      {
        type: 'doc',
        id: 'quick-start',
        label: '快速开始',
      },
    {
      type: 'category',
      label: '核心概念',
      items: [
        'core-concepts/architecture',
        'core-concepts/agents',
        'core-concepts/tools',
        'core-concepts/memory',
      ],
    },
    {
      type: 'category',
      label: '使用指南',
      items: [
        'guides/creating-agents',
        'guides/custom-tools',
        'guides/agent-communication',
        'guides/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      items: [
        'api/agent-api',
        'api/tool-api',
        'api/memory-api',
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
