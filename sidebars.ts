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
    {
      type: 'category',
      label: '开发框架',
      items: [
        {
          type: 'link',
          label: 'Agent Framework',
          href: '/docs/frameworks/agent-framework/current/quick-start',
        },
        {
          type: 'link',
          label: 'Graph Core',
          href: '/docs/frameworks/graph-core/current/quick-start',
        },
        {
          type: 'category',
          label: 'Admin',
          items: [
            'frameworks/admin/quick-start',
            'frameworks/admin/troubleshooting',
          ],
        },
        {
          type: 'category',
          label: 'Extensions',
          items: [
            'frameworks/extensions/advisors',
            'frameworks/extensions/chat-client',
            'frameworks/extensions/chat-model',
            'frameworks/extensions/concepts',
            'frameworks/extensions/docker-compose',
            'frameworks/extensions/embedding',
            'frameworks/extensions/ETL',
            'frameworks/extensions/MCP-client',
            'frameworks/extensions/MCP-server',
            'frameworks/extensions/MCP-tool',
            'frameworks/extensions/MCP',
            'frameworks/extensions/memory',
            'frameworks/extensions/model-context-protocol',
            'frameworks/extensions/model-evaluation',
            'frameworks/extensions/multimodality',
            'frameworks/extensions/observability',
            'frameworks/extensions/prompt-engineering-patterns',
            'frameworks/extensions/prompt',
            'frameworks/extensions/RAG',
            'frameworks/extensions/retriever',
            'frameworks/extensions/spring-ai-alibaba-mcp-nacos-introduce',
            'frameworks/extensions/structured-output',
            'frameworks/extensions/test',
            'frameworks/extensions/tool-calling',
            'frameworks/extensions/vectorstore',
            {
              type: 'category',
              label: 'Models',
              items: [
                'frameworks/extensions/models/dashScope',
                'frameworks/extensions/models/deepseek',
                'frameworks/extensions/models/like-openAI',
                'frameworks/extensions/models/ollama',
                'frameworks/extensions/models/openAI',
                'frameworks/extensions/models/qwq',
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '智能体',
      items: [
        {
          type: 'category',
          label: 'DataAgent',
          items: [
            'agents/dataagent/quick-start',
            {
              type: 'category',
              label: '部署',
              items: [
                'agents/dataagent/deployment/local',
                'agents/dataagent/deployment/docker',
                'agents/dataagent/deployment/kubernetes',
              ],
            },
            'agents/dataagent/user-guide',
            'agents/dataagent/troubleshooting',
          ],
        },
        {
          type: 'category',
          label: 'JManus',
          items: [
            'agents/jmanus/quick-start',
            {
              type: 'category',
              label: '部署',
              items: [
                'agents/jmanus/deployment/local',
                'agents/jmanus/deployment/docker',
                'agents/jmanus/deployment/kubernetes',
              ],
            },
            'agents/jmanus/user-guide',
            'agents/jmanus/troubleshooting',
          ],
        },
        {
          type: 'category',
          label: 'DeepResearch',
          items: [
            'agents/deepresearch/quick-start',
            {
              type: 'category',
              label: '部署',
              items: [
                'agents/deepresearch/deployment/local',
                'agents/deepresearch/deployment/docker',
                'agents/deepresearch/deployment/kubernetes',
              ],
            },
            'agents/deepresearch/user-guide',
            'agents/deepresearch/troubleshooting',
          ],
        },
      ],
    },
  ],
}

export default sidebars
