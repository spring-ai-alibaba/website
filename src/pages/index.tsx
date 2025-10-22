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
              <span className={styles.label}>React</span>
              <span className={styles.label}>Docs</span>
              <span className={styles.label}>AI</span>
              <span className={styles.label}>Docusaurus</span>
            </div>
            
            <div className={styles.heroButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to="/docs/intro">
                📚 <Translate id="homepage.quickStart" description="Quick Start button text">快速开始</Translate>
              </Link>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to={githubUrls.repo}>
                ⭐ <Translate id="homepage.viewOnGithub" description="View on GitHub button text">在 GitHub 查看</Translate>
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
                <div className={styles.codeTitle}>HelloWorld.java</div>
              </div>
              <div className={styles.codeContent}>
                <div className={styles.codeLine}>
                  <span className={styles.codeKeyword}>public</span>{' '}
                  <span className={styles.codeKeyword}>class</span>{' '}
                  <span className={styles.codeClass}>HelloWorld</span>{' '}
                  <span className={styles.codeOperator}>{'{'}</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeComment}>// Main method - entry point</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeKeyword}>public</span>{' '}
                  <span className={styles.codeKeyword}>static</span>{' '}
                  <span className={styles.codeKeyword}>void</span>{' '}
                  <span className={styles.codeMethod}>main</span><span className={styles.codeOperator}>(</span><span className={styles.codeClass}>String</span><span className={styles.codeOperator}>[]</span>{' '}
                  <span className={styles.codeVariable}>args</span><span className={styles.codeOperator}>)</span>{' '}
                  <span className={styles.codeOperator}>{'{'}</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeComment}>// Print welcome message</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeClass}>System</span><span className={styles.codeOperator}>.</span><span className={styles.codeVariable}>out</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>println</span><span className={styles.codeOperator}>(</span><span className={styles.codeString}>"🚀 Hello, World!"</span><span className={styles.codeOperator}>);</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeClass}>System</span><span className={styles.codeOperator}>.</span><span className={styles.codeVariable}>out</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>println</span><span className={styles.codeOperator}>(</span><span className={styles.codeString}>"✨ Welcome to Java!"</span><span className={styles.codeOperator}>);</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeComment}>// Display current time</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeClass}>LocalDateTime</span>{' '}
                  <span className={styles.codeVariable}>now</span>{' '}
                  <span className={styles.codeOperator}>=</span>{' '}
                  <span className={styles.codeClass}>LocalDateTime</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>now</span><span className={styles.codeOperator}>();</span>
                </div>
                <div className={styles.codeLine}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.codeClass}>System</span><span className={styles.codeOperator}>.</span><span className={styles.codeVariable}>out</span><span className={styles.codeOperator}>.</span><span className={styles.codeMethod}>println</span><span className={styles.codeOperator}>(</span><span className={styles.codeString}>"⏰ Current time: "</span>{' '}
                  <span className={styles.codeOperator}>+</span>{' '}
                  <span className={styles.codeVariable}>now</span><span className={styles.codeOperator}>);</span>
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

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={translate({
        id: 'homepage.title',
        message: '欢迎使用项目名称',
        description: 'The homepage title'
      })}
      description={translate({
        id: 'homepage.description', 
        message: "基于 Docusaurus 3 构建的双主题文档网站模板",
        description: 'The homepage description'
      })}>
      <MeteorShower />
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
