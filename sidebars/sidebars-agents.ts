import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Sidebar configuration for Agents documentation
 */

const sidebars: SidebarsConfig = {
  agentsSidebar: [
    {
      type: 'category',
      label: 'DeepResearch',
      items: [
        'deepresearch/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'DataAgent',
      items: [
        'dataagent/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'JManus',
      items: [
        'jmanus/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'AssistantAgent',
      items: [
        { type: 'doc', id: 'assistantagent/quick-start', label: 'AssistantAgent 快速开始' },
        { type: 'doc', id: 'assistantagent/secondary-development', label: '二次开发指南' },
        {
          type: 'category',
          label: '核心模块',
          items: [
            {
              type: 'category',
              label: '评估模块',
              items: [
                { type: 'doc', id: 'assistantagent/features/evaluation/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/evaluation/advanced', label: '高级特性' },
              ],
            },
            {
              type: 'category',
              label: 'Prompt Builder',
              items: [
                { type: 'doc', id: 'assistantagent/features/prompt-builder/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/prompt-builder/advanced', label: '高级特性' },
              ],
            },
          ],
        },
        {
          type: 'category',
          label: '工具扩展',
          items: [
            {
              type: 'category',
              label: 'MCP 工具',
              items: [
                { type: 'doc', id: 'assistantagent/features/mcp/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/mcp/advanced', label: '高级特性' },
              ],
            },
            {
              type: 'category',
              label: '动态 HTTP 工具',
              items: [
                { type: 'doc', id: 'assistantagent/features/dynamic-http/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/dynamic-http/advanced', label: '高级特性' },
              ],
            },
            {
              type: 'category',
              label: '自定义 CodeAct 工具',
              items: [
                { type: 'doc', id: 'assistantagent/features/custom-codeact-tool/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/custom-codeact-tool/advanced', label: '高级特性' },
              ],
            },
          ],
        },
        {
          type: 'category',
          label: '智能能力',
          items: [
            {
              type: 'category',
              label: '经验模块',
              items: [
                { type: 'doc', id: 'assistantagent/features/experience/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/experience/advanced', label: '高级特性' },
              ],
            },
            {
              type: 'category',
              label: '学习模块',
              items: [
                { type: 'doc', id: 'assistantagent/features/learning/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/learning/advanced', label: '高级特性' },
              ],
            },
            {
              type: 'category',
              label: '搜索模块',
              items: [
                { type: 'doc', id: 'assistantagent/features/search/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/search/advanced', label: '高级特性' },
              ],
            },
          ],
        },
        {
          type: 'category',
          label: '交互能力',
          items: [
            {
              type: 'category',
              label: '回复渠道',
              items: [
                { type: 'doc', id: 'assistantagent/features/reply/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/reply/advanced', label: '高级特性' },
              ],
            },
            {
              type: 'category',
              label: '触发器',
              items: [
                { type: 'doc', id: 'assistantagent/features/trigger/quickstart', label: '快速开始' },
                { type: 'doc', id: 'assistantagent/features/trigger/advanced', label: '高级特性' },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default sidebars
