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
      label: '教程',
      items: [
        'tutorials/agents',
        'tutorials/hooks',
        'tutorials/memory',
        'tutorials/messages',
        'tutorials/models',
        'tutorials/structured-output',
        'tutorials/tools',
      ],
    },
    {
      type: 'category',
      label: '高级功能',
      items: [
        'advanced/a2a',
        'advanced/agent-tool',
        'advanced/context-engineering',
        'advanced/human-in-the-loop',
        'advanced/memory',
        'advanced/multi-agent',
        'advanced/rag',
        'advanced/workflow',
      ],
    },
  ],
}

export default sidebars
