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
        'examples/llm-streaming-springai',
        'examples/persistence',
        'examples/checkpoint-redis',
        'examples/time-travel',
        'examples/long-time-running-task',
        'examples/human-in-the-loop',
        'examples/mcp-node',
        'examples/parallel-branch',
        'examples/parallel-streaming',
        'examples/subgraph',
        'examples/subgraph-as-compiledgraph',
        'examples/subgraph-as-nodeaction',
        'examples/subgraph-as-stategraph',
        'examples/multi-agent-supervisor',
        'examples/plantuml',
        'examples/cancellation',
      ],
    },
  ],
}

export default sidebars
