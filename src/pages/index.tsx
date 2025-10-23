import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import EcosystemShowcase from '@site/src/components/EcosystemShowcase';
import MeteorShower from '@site/src/components/MeteorShower';
import FloatingClouds from '../components/FloatingClouds';
import TypewriterCode from '@site/src/components/TypewriterCode';
import Translate, {translate} from '@docusaurus/Translate';

import styles from './index.module.css';
import projectConfig, { getGitHubUrls } from '../../project.config';

// Generate GitHub links from project configuration
const githubUrls = getGitHubUrls(projectConfig);

// 示例代码字符串
const sampleCode = `@RestController
@RequestMapping
@SpringBootApplication
public class AIChatApplication {

    @Autowired
    private ChatModel dashScopeChatModel;

    @GetMapping
    public String chat() {
        return dashScopeChatModel.call(
            new Prompt(DEFAULT_PROMPT,
                DashScopeChatOptions.builder()
                    .withModel(DashScopeApi.ChatModel.QWEN_PLUS.getValue())
                    .build()))
            .getResult().getOutput().getText();
    }
}`;

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
              <span className={styles.label}>✨ AI-Native</span>
            </div>

            <div className={styles.heroButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to="/docs/intro">
                💻 &nbsp; <Translate id="homepage.quickStart" description="Quick Start button text">快速开始</Translate>
              </Link>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to={githubUrls.repo}>
                <svg style={{ width: '1.2em', height: '1.2em', marginRight: '0.5em', verticalAlign: 'middle' }} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                &nbsp;
                <Translate id="homepage.viewOnGithub" description="View on GitHub button text">在 GitHub 查看</Translate>
              </Link>
            </div>
          </div>
          <div className={styles.heroRight}>
            <TypewriterCode
              code={sampleCode}
              fileName="AIChatApplication.java"
              language="java"
              typingSpeed={50}
              startDelay={800}
            />
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
        <EcosystemShowcase />
      </main>
    </Layout>
  );
}
