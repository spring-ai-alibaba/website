import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Sidebar configuration for Agents documentation
 */

const sidebars: SidebarsConfig = {
  ecosystemSidebar: [
    {
      type: 'category',
      label: 'Spring AI',
      items: [
        {
          type: 'category',
          label: '概览',
          items: [
            'spring-ai/reference/concepts',
          ],
        },
        {
          type: 'category',
          label: '文档',
          items: [
            {
              type: 'category',
              label: 'Chat API',
              items: [
                'spring-ai/reference/chat-model',
                {
                  type: 'category',
                  label: 'Chat Client API',
                  items: [
                    'spring-ai/reference/chat-client',
                    'spring-ai/reference/advisors',
                  ],
                },
              ],
            },
            {
              type: 'category',
              label: 'Prompt Engineer',
              items: [
                'spring-ai/reference/prompt',
                'spring-ai/reference/prompt-engineering-patterns',
              ],
            },
            'spring-ai/reference/structured-output',
            'spring-ai/reference/multimodality',
            'spring-ai/reference/memory',
            'spring-ai/reference/tool-calling',
            {
              type: 'category',
              label: 'MCP Integration',
              items: [
                'spring-ai/reference/MCP-client',
                'spring-ai/reference/MCP-server',
                'spring-ai/reference/MCP-tool',
                'spring-ai/reference/MCP',
                'spring-ai/reference/model-context-protocol',
              ],
            },
            {
              type: 'category',
              label: 'RAG Integration',
              items: [
                'spring-ai/reference/RAG',
                'spring-ai/reference/ETL',
                'spring-ai/reference/retriever',
              ],
            },
            'spring-ai/reference/docker-compose',
            'spring-ai/reference/embedding',
            'spring-ai/reference/model-evaluation',
            'spring-ai/reference/observability',
            'spring-ai/reference/vectorstore',
            'spring-ai/reference/test',
          ],
        },
        {
          type: 'category',
          label: 'Model Integration',
          items: [
            {
              type: 'category',
              label: 'Chat Models',
              items: [
                'spring-ai/models/dashScope',
                'spring-ai/models/deepseek',
                'spring-ai/models/like-openAI',
                'spring-ai/models/ollama',
                'spring-ai/models/openAI',
                'spring-ai/models/qwq',
              ],
            },
            'spring-ai/models/image',
            'spring-ai/models/embedding',
            'spring-ai/models/audio',
            'spring-ai/models/video',
          ],
        },
        {
          type: 'category',
          label: 'Ecosystem Integration',
          items: [
            'spring-ai/reference/spring-ai-alibaba-mcp-nacos-introduce',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Admin',
      items: [
        'admin/quick-start',
      ],
    },
  ],
}

export default sidebars
