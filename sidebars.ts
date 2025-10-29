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
            'frameworks/spring-ai/reference/advisors',
            'frameworks/spring-ai/reference/chat-client',
            'frameworks/spring-ai/reference/chat-model',
            'frameworks/spring-ai/reference/concepts',
            'frameworks/spring-ai/reference/docker-compose',
            'frameworks/spring-ai/reference/embedding',
            'frameworks/spring-ai/reference/ETL',
            'frameworks/spring-ai/reference/MCP-client',
            'frameworks/spring-ai/reference/MCP-server',
            'frameworks/spring-ai/reference/MCP-tool',
            'frameworks/spring-ai/reference/MCP',
            'frameworks/spring-ai/reference/memory',
            'frameworks/spring-ai/reference/model-context-protocol',
            'frameworks/spring-ai/reference/model-evaluation',
            'frameworks/spring-ai/reference/multimodality',
            'frameworks/spring-ai/reference/observability',
            'frameworks/spring-ai/reference/prompt-engineering-patterns',
            'frameworks/spring-ai/reference/prompt',
            'frameworks/spring-ai/reference/RAG',
            'frameworks/spring-ai/reference/retriever',
            'frameworks/spring-ai/reference/spring-ai-alibaba-mcp-nacos-introduce',
            'frameworks/spring-ai/reference/structured-output',
            'frameworks/spring-ai/reference/test',
            'frameworks/spring-ai/reference/tool-calling',
            'frameworks/spring-ai/reference/vectorstore',
            {
              type: 'category',
              label: 'Models',
              items: [
                'frameworks/spring-ai/models/dashScope',
                'frameworks/spring-ai/models/deepseek',
                'frameworks/spring-ai/models/like-openAI',
                'frameworks/spring-ai/models/ollama',
                'frameworks/spring-ai/models/openAI',
                'frameworks/spring-ai/models/qwq',
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
