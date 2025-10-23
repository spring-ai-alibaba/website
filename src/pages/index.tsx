import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import MeteorShower from '@site/src/components/MeteorShower';
import FloatingClouds from '../components/FloatingClouds';
import Translate, {translate} from '@docusaurus/Translate';

import styles from './index.module.css';
import projectConfig, { getGitHubUrls } from '../../project.config';

// Generate GitHub links from project configuration
const githubUrls = getGitHubUrls(projectConfig);

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <FloatingClouds />
      <div className={clsx('container', styles.heroContainer)}>
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div className={styles.titleRow}>
              <img
                src="img/logo.svg"
                alt={siteConfig.title}
                className={styles.heroLogo}
              />
              <h1 className={clsx('hero__title', styles.heroTitle)}>
                {siteConfig.title}
              </h1>
            </div>
            <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
              {siteConfig.tagline}
            </p>

            <div className={styles.heroLabels}>
              <span className={styles.label}>☕ Java</span>
              <span className={styles.label}>🤖 Artificial Intelligence</span>
              <span className={styles.label}>🍃 Spring AI</span>
              <span className={styles.label}>🎯 Agent</span>
              <span className={styles.label}>✨ AI-Native</span>
            </div>

            <div className={styles.heroButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to="/docs/intro">
                <Translate id="homepage.quickStart" description="Quick Start button text">快速开始</Translate>
              </Link>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to={githubUrls.repo}>
                <Translate id="homepage.viewOnGithub" description="View on GitHub button text">在 GitHub 查看</Translate>
              </Link>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.codePreview}>
              <div className={styles.codeHeader}>
                <div className={styles.codeDots}>
                  <div className={styles.dot}></div>
                  <div className={styles.dot}></div>
                  <div className={styles.dot}></div>
                </div>
                <div className={styles.codeTitle}>AIChatApplication.java</div>
              </div>
              <div className={styles.codeContent}>

                 <div className={styles.codeLine}>
                  <span className={styles.codeAnnotation}>@</span><span className={styles.codeClass}>RestController</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeAnnotation}>@</span><span className={styles.codeClass}>RequestMapping</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeAnnotation}>@</span><span className={styles.codeClass}>SpringBootApplication</span>{' '}
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeKeyword}>public</span>{' '}
                  <span className={styles.codeKeyword}>class</span>{' '}
                  <span className={styles.codeClass}>AIChatApplication</span>{' '}
                  <span className={styles.codeOperator}>{'{'}</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>private</span>{' '}
                  <span className={styles.codeKeyword}>final</span>{' '}
                  <span className={styles.codeClass}>ChatModel</span>{' '}
                  <span className={styles.codeVariable}>dashScopeChatModel</span><span className={styles.codeOperator}>;</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>public</span>{' '}
                  <span className={styles.codeMethod}>AIChatApplication</span><span className={styles.codeOperator}>(</span><span className={styles.codeClass}>ChatModel</span>{' '}
                  <span className={styles.codeVariable}>chatModel</span><span className={styles.codeOperator}>)</span>{' '}
                  <span className={styles.codeOperator}>{'{'}</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>this</span><span className={styles.codeOperator}>.</span><span className={styles.codeVariable}>dashScopeChatModel</span>{' '}
                  <span className={styles.codeOperator}>=</span>{' '}
                  <span className={styles.codeVariable}>chatModel</span><span className={styles.codeOperator}>;</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeOperator}>{'}'}</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeAnnotation}>@</span><span className={styles.codeClass}>GetMapping</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>public</span>{' '}
                  <span className={styles.codeClass}>String</span>{' '}
                  <span className={styles.codeMethod}>chat</span><span className={styles.codeOperator}>()</span>{' '}
                  <span className={styles.codeOperator}>{'{'}</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>return</span>{' '}
                  <span className={styles.codeVariable}>dashScopeChatModel</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>call</span><span className={styles.codeOperator}>(</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>new</span>{' '}
                  <span className={styles.codeClass}>Prompt</span><span className={styles.codeOperator}>(</span><span className={styles.codeVariable}>DEFAULT_PROMPT</span><span className={styles.codeOperator}>,</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeClass}>DashScopeChatOptions</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>builder</span><span className={styles.codeOperator}>()</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>withModel</span><span className={styles.codeOperator}>(</span><span className={styles.codeClass}>DashScopeApi</span><span className={styles.codeOperator}>.</span><span className={styles.codeClass}>ChatModel</span><span className={styles.codeOperator}>.</span><span className={styles.codeVariable}>QWEN_PLUS</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>getValue</span><span className={styles.codeOperator}>())</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>build</span><span className={styles.codeOperator}>()))</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>getResult</span><span className={styles.codeOperator}>().</span><span className={styles.codeMethod}>getOutput</span><span className={styles.codeOperator}>().</span><span className={styles.codeMethod}>getText</span><span className={styles.codeOperator}>();</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeOperator}>{'}'}</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeOperator}>{'}'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ArchitectureSection() {
  return (
    <section className={styles.architectureSection}>
      <div className="container">
        <div className={styles.architectureContent}>
          <h2 className={styles.architectureTitle}>
            <Translate id="homepage.architecture.title" description="Architecture section title">
              帮助 Java 开发者步入 AI Native 时代
            </Translate>
          </h2>

          <div className={styles.architectureImageWrapper}>
            <img
              src="/img/index/index.webp"
              alt="Spring AI Alibaba Architecture"
              className={styles.architectureImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={siteConfig.tagline}>
      <MeteorShower />
      <HomepageHeader />
      <main>
        <ArchitectureSection />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
