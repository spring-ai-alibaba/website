import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Sidebar configuration for Agents documentation
 */

const sidebars: SidebarsConfig = {
  agentsSidebar: [
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
      label: 'DeepResearch',
      items: [
        'deepresearch/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Copilot',
      items: [
        'copilot/quick-start',
      ],
    },
  ],
}

export default sidebars
