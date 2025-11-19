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
        'core/memory',
        'core/persistence',
        'core/streaming',
      ],
    },
    {
      type: 'category',
      label: '示例',
      items: [
        'examples/cancellation',
        'examples/checkpoint-postgres',
        'examples/human-in-the-loop',
        'examples/llm-streaming-springai',
        'examples/long-time-running-task',
        'examples/mcp-node',
        'examples/multi-agent-supervisor',
        'examples/parallel-branch',
        'examples/parallel-streaming',
        'examples/persistence',
        'examples/plantuml',
        'examples/subgraph',
        'examples/subgraph-as-compiledgraph',
        'examples/subgraph-as-nodeaction',
        'examples/subgraph-as-stategraph',
        'examples/time-travel',
      ],
    },
  ],
}

export default sidebars
