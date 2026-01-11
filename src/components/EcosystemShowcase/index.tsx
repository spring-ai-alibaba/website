import React from 'react'
import Link from '@docusaurus/Link'
import Translate from '@docusaurus/Translate'
import styles from './styles.module.css'

interface EcosystemItem {
  name: string;
  nameId: string;
  description: string;
  descriptionId: string;
  icon: string;
  repoUrl?: string;
  docUrl?: string;
  stars?: string;
}

const frameworkItems: EcosystemItem[] = [
  {
    name: 'Spring AI Alibaba Agent Framework',
    nameId: 'ecosystem.framework.agent.name',
    description: 'Framework for building agent and multi-agent applications, with embedded context engineering support.',
    descriptionId: 'ecosystem.framework.agent.description',
    icon: '🚀',
    repoUrl: 'https://github.com/alibaba/spring-ai-alibaba',
    docUrl: '/docs/frameworks/agent-framework/tutorials/agents',
    stars: 'spring-ai-alibaba',
  },
  {
    name: 'Spring AI Alibaba Graph',
    nameId: 'ecosystem.framework.graph.name',
    description: 'A low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents.',
    descriptionId: 'ecosystem.framework.graph.description',
    icon: '🔗',
    repoUrl: 'https://github.com/alibaba/spring-ai-alibaba',
    docUrl: '/docs/frameworks/graph-core/quick-start',
    stars: 'spring-ai-alibaba-graph',
  },
  {
    name: 'Spring AI Alibaba Studio',
    nameId: 'ecosystem.framework.graphCommunity.name',
    description: 'Spring AI Alibaba Agent Chat UI.',
    descriptionId: 'ecosystem.framework.graphCommunity.description',
    icon: '🌐',
    repoUrl: 'https://github.com/alibaba/spring-ai-alibaba',
    stars: 'spring-ai-alibaba-graph-community',
  },
  {
    name: 'Spring AI Alibaba Admin',
    nameId: 'ecosystem.framework.admin.name',
    description: 'Local visualization toolkit for the development of agent applications, supporting project management, runtime visualization, tracing, and agent evaluation.',
    descriptionId: 'ecosystem.framework.admin.description',
    icon: '📊',
    repoUrl: 'https://github.com/spring-ai-alibaba/spring-ai-alibaba-admin',
    docUrl: '/ecosystem/admin/quick-start',
    stars: 'spring-ai-alibaba-admin',
  },
  {
    name: 'Spring AI',
    nameId: 'ecosystem.framework.extensions.name',
    description: 'Extended implementations for Spring AI core concepts, including DashScopeChatModel, MCP registry, etc.',
    descriptionId: 'ecosystem.framework.extensions.description',
    icon: '🔌',
    repoUrl: 'https://github.com/spring-ai-alibaba/spring-ai-extensions',
    docUrl: '/ecosystem/spring-ai/reference/concepts',
    stars: 'spring-ai-extensions',
  },
]

const productItems: EcosystemItem[] = [
  {
    name: 'JManus',
    nameId: 'ecosystem.product.jmanus.name',
    description: 'A Java implementation of Manus built with Spring AI Alibaba, currently used in many applications within Alibaba Group.',
    descriptionId: 'ecosystem.product.jmanus.description',
    icon: '🤖',
    repoUrl: 'https://github.com/spring-ai-alibaba/jmanus',
    docUrl: '/agents/jmanus/quick-start',
    stars: 'jmanus',
  },
  {
    name: 'DataAgent',
    nameId: 'ecosystem.product.dataagent.name',
    description: 'A natural language to SQL project based on Spring AI Alibaba, enabling you to query databases directly with natural language without writing complex SQL.',
    descriptionId: 'ecosystem.product.dataagent.description',
    icon: '🗃️',
    repoUrl: 'https://github.com/spring-ai-alibaba/dataagent',
    docUrl: '/agents/dataagent/quick-start',
    stars: 'dataagent',
  },
  {
    name: 'DeepResearch',
    nameId: 'ecosystem.product.deepresearch.name',
    description: 'Deep Research implemented based on spring-ai-alibaba-graph.',
    descriptionId: 'ecosystem.product.deepresearch.description',
    icon: '🔬',
    repoUrl: 'https://github.com/spring-ai-alibaba/deep-research',
    docUrl: '/agents/deepresearch/quick-start',
    stars: 'deep-research',
  },
  {
    name: 'Copilot',
    nameId: 'ecosystem.product.copilot.name',
    description: 'An AI programming assistant agent built with Spring AI Alibaba, helping developers write better code faster.',
    descriptionId: 'ecosystem.product.copilot.description',
    icon: '💻',
    repoUrl: 'https://github.com/spring-ai-alibaba/copilot',
    docUrl: '/agents/deepresearch/quick-start',
    stars: 'copilot',
  },
]

interface EcosystemCardProps {
  item: EcosystemItem;
}

function EcosystemCard({ item }: EcosystemCardProps): React.JSX.Element {
  return (
    <div className={styles.ecosystemCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{item.icon}</span>
        <h3 className={styles.cardTitle}>
          <Translate id={item.nameId}>{item.name}</Translate>
        </h3>
      </div>
      <p className={styles.cardDescription}>
        <Translate id={item.descriptionId}>{item.description}</Translate>
      </p>
      <div className={styles.cardFooter}>
        <div className={styles.cardLinks}>
          {item.docUrl && (
            <Link to={item.docUrl} className={styles.cardLink}>
              <svg className={styles.docIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <Translate id="ecosystem.viewDocs">查看文档</Translate>
              <span className={styles.externalIcon}>→</span>
            </Link>
          )}
          {item.repoUrl && (
            <a
              href={item.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardLink}>
              <svg
                className={styles.githubIcon}
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <Translate id="ecosystem.viewOnGithub">View on GitHub</Translate>
              <span className={styles.externalIcon}>→</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EcosystemShowcase(): React.JSX.Element {
  // Split framework items: first 2 and last 3
  const topFrameworkItems = frameworkItems.slice(0, 2)
  const bottomFrameworkItems = frameworkItems.slice(2)

  return (
    <section className={styles.ecosystem}>
      <div className="container">
        <div className={styles.ecosystemHeader}>
          <h2 className={styles.ecosystemTitle}>
            <Translate id="ecosystem.title">Spring AI Alibaba's Ecosystem</Translate>
          </h2>
          <p className={styles.ecosystemSubtitle}>
            <Translate id="ecosystem.subtitle">
              A comprehensive ecosystem for building intelligent applications
            </Translate>
          </p>
        </div>

        {/* Framework Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🏗️</span>
              <Translate id="ecosystem.framework.title">Core Framework</Translate>
            </h3>
            <p className={styles.sectionDescription}>
              <Translate id="ecosystem.framework.description">
                Foundation frameworks for building AI-powered applications
              </Translate>
            </p>
          </div>
          {/* Top row: 2 items */}
          <div className={styles.frameworkGrid}>
            {topFrameworkItems.map((item, idx) => (
              <EcosystemCard key={idx} item={item} />
            ))}
          </div>
          {/* Bottom row: 3 items */}
          <div className={styles.frameworkGridBottom}>
            {bottomFrameworkItems.map((item, idx) => (
              <EcosystemCard key={idx} item={item} />
            ))}
          </div>
        </div>

        {/* Products Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎯</span>
              <Translate id="ecosystem.product.title">Built with Spring AI Alibaba</Translate>
            </h3>
            <p className={styles.sectionDescription}>
              <Translate id="ecosystem.product.description">
                Production-ready applications powered by our framework
              </Translate>
            </p>
          </div>
          <div className={styles.cardGrid}>
            {productItems.map((item, idx) => (
              <EcosystemCard key={idx} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
