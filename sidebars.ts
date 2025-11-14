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
  docsSidebar: [
    'overview',
    'quick-start',
    {
      type: 'category',
      label: 'Agent Framework',
      items: [
        {
          type: 'category',
          label: '教程',
          items: [
            'frameworks/agent-framework/tutorials/agents',
            'frameworks/agent-framework/tutorials/hooks',
            'frameworks/agent-framework/tutorials/memory',
            'frameworks/agent-framework/tutorials/messages',
            'frameworks/agent-framework/tutorials/models',
            'frameworks/agent-framework/tutorials/structured-output',
            'frameworks/agent-framework/tutorials/tools',
          ],
        },
        {
          type: 'category',
          label: '高级功能',
          items: [
            'frameworks/agent-framework/advanced/a2a',
            'frameworks/agent-framework/advanced/agent-tool',
            'frameworks/agent-framework/advanced/context-engineering',
            'frameworks/agent-framework/advanced/human-in-the-loop',
            'frameworks/agent-framework/advanced/memory',
            'frameworks/agent-framework/advanced/multi-agent',
            'frameworks/agent-framework/advanced/rag',
            'frameworks/agent-framework/advanced/workflow',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Graph Core',
      items: [
        'frameworks/graph-core/quick-start',
        {
          type: 'category',
          label: '核心功能',
          items: [
            'frameworks/graph-core/core/cancellation',
            'frameworks/graph-core/core/checkpoint-postgres',
            'frameworks/graph-core/core/core-library',
            'frameworks/graph-core/core/human-in-the-loop',
            'frameworks/graph-core/core/long-time-running-task',
            'frameworks/graph-core/core/mcp-node',
            'frameworks/graph-core/core/memory',
            'frameworks/graph-core/core/parallel-branch',
            'frameworks/graph-core/core/persistence',
            'frameworks/graph-core/core/streaming',
            'frameworks/graph-core/core/subgraph',
          ],
        },
        {
          type: 'category',
          label: '示例',
          items: [
            'frameworks/graph-core/examples/adaptiverag',
            'frameworks/graph-core/examples/llm-streaming-springai',
            'frameworks/graph-core/examples/parallel-branch',
            'frameworks/graph-core/examples/persistence',
            'frameworks/graph-core/examples/plantuml',
            'frameworks/graph-core/examples/subgraph-as-compiledgraph',
            'frameworks/graph-core/examples/subgraph-as-nodeaction',
            'frameworks/graph-core/examples/subgraph-as-stategraph',
            'frameworks/graph-core/examples/time-travel',
            'frameworks/graph-core/examples/wait-user-input',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Agent Chat UI',
      items: [
        'frameworks/studio/quick-start',
      ],
    },
  ],
}

export default sidebars
