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
        'core/core-library',
        'core/streaming',
        'core/human-in-the-loop',
        'core/mcp-node',
        'core/memory',
        'core/checkpoint-postgres',
        'core/long-time-running-task',
        'core/persistence',
        'core/parallel-branch',
        'core/subgraph',
        'core/cancellation',
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
