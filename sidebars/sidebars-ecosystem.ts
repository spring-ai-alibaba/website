import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Sidebar configuration for Agents documentation
 */

const sidebars: SidebarsConfig = {
  ecosystemSidebar: [
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
