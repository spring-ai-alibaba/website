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
      label: '核心功能',
      items: [
        'core/cancellation',
        'core/checkpoint-postgres',
        'core/core-library',
        'core/human-in-the-loop',
        'core/long-time-running-task',
        'core/mcp-node',
        'core/memory',
        'core/parallel-branch',
        'core/persistence',
        'core/streaming',
        'core/subgraph',
      ],
    },
    {
      type: 'category',
      label: '示例',
      items: [
        'examples/adaptiverag',
        'examples/llm-streaming-springai',
        'examples/parallel-branch',
        'examples/persistence',
        'examples/plantuml',
        'examples/subgraph-as-compiledgraph',
        'examples/subgraph-as-nodeaction',
        'examples/subgraph-as-stategraph',
        'examples/time-travel',
        'examples/wait-user-input',
      ],
    },
  ],
}

export default sidebars
