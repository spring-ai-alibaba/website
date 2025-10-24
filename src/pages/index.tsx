import React, { useEffect, useRef } from 'react';
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
            new Prompt("hi, llms",
                DashScopeChatOptions.builder()
                    .withModel(DashScopeApi.ChatModel.QWEN_PLUS.getValue())
                    .build()))
            .getResult().getOutput().getText();
    }
}`;

// Neural Network Animation Component
function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const nodes: Array<{x: number; y: number; vx: number; vy: number}> = [];
    const nodeCount = 30;

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.fill();

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i === j) return;

          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.3 * (1 - distance / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className={styles.neuralNetwork} />;
}

// Feature Card Component
function FeatureCard({ icon, title, description }: {
  icon: string;
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <FloatingClouds />
      <NeuralNetwork />
      <div className={styles.springLeaves}>
        <div className={styles.springLeaf}></div>
        <div className={styles.springLeaf}></div>
        <div className={styles.springLeaf}></div>
      </div>
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
              <span className={styles.label}>
                <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Java
              </span>
              <span className={styles.label}>
                <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,2H4C2.9,2,2,2.9,2,4v16c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2z M8.5,15L8.5,15 c-0.83,0-1.5-0.67-1.5-1.5v-3C7,9.67,7.67,9,8.5,9l0,0C9.33,9,10,9.67,10,10.5v3C10,14.33,9.33,15,8.5,15z M15.5,15L15.5,15 c-0.83,0-1.5-0.67-1.5-1.5v-3c0-0.83,0.67-1.5,1.5-1.5l0,0c0.83,0,1.5,0.67,1.5,1.5v3C17,14.33,16.33,15,15.5,15z"/>
                </svg>
                AI
              </span>
              <span className={styles.label}>
                <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>
                </svg>
                Spring AI
              </span>
              <span className={styles.label}>
                <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,17V16H9V14H13V13H10A1,1 0 0,1 9,12V10A1,1 0 0,1 10,9H14V10H12V11H14V12H15V14A1,1 0 0,1 14,15H10V16H13V17H11Z"/>
                </svg>
                AI-Native
              </span>
            </div>

            <div className={styles.heroButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to="/docs/intro">
                <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,4V20H15V4H9M4,8V16H6V8H4M18,8V16H20V8H18Z" />
                </svg>
                &nbsp; <Translate id="homepage.quickStart" description="Quick Start button text">快速开始</Translate>
              </Link>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton)}
                to={githubUrls.repo}>
                <svg style={{ width: '1.2em', height: '1.2em', marginRight: '0.5em', verticalAlign: 'middle' }} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
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
              src="/img/index/index.png"
              alt="Spring AI Alibaba Architecture"
              className={styles.architectureImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AcknowledgmentsSection() {
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          <Translate id="homepage.acknowledgments.title" description="Acknowledgments section title">
            致谢
          </Translate>
        </h2>
        <p className={styles.sectionSubtitle}>
          <Translate id="homepage.acknowledgments.subtitle" description="Acknowledgments section subtitle">
            Spring AI Alibaba 的成功离不开开源社区和合作伙伴的支持
          </Translate>
        </p>
        <div className={styles.acknowledgmentsGrid}>
          <div className={styles.acknowledgmentCard}>
            <div className={styles.acknowledgmentIcon}>
              <img
                src="https://docs.spring.io/spring-ai/reference/_images/spring_ai_logo_with_text.svg"
                alt="Spring AI Logo"
                style={{ width: '100%', height: 'auto', maxWidth: '120px' }}
              />
            </div>
            <h3 className={styles.acknowledgmentTitle}>Spring AI</h3>
            <p className={styles.acknowledgmentDescription}>
              <Translate id="homepage.acknowledgments.springai.description" description="Spring AI acknowledgment">
                感谢 Spring AI 团队提供的优秀框架，为 AI 应用开发提供了坚实的基础
              </Translate>
            </p>
            <a
              href="https://github.com/spring-projects/spring-ai"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.acknowledgmentLink}
            >
              <Translate id="homepage.acknowledgments.viewOnGithub" description="View on GitHub">
                访问 GitHub
              </Translate>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.707 9.293a1 1 0 01-1.414 1.414L9 9.414V13a1 1 0 11-2 0V9.414L5.707 10.707a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3z"/>
              </svg>
            </a>
          </div>

          <div className={styles.acknowledgmentCard}>
            <div className={styles.acknowledgmentIcon}>
              <img
                src="https://img.alicdn.com/imgextra/i1/O1CN01p9GgeC2AENLT5qzaQ_!!6000000008171-2-tps-162-162.png"
                alt="Bailian Logo"
                style={{ width: '100%', height: 'auto', maxWidth: '120px' }}
              />
            </div>
            <h3 className={styles.acknowledgmentTitle}>
              <Translate id="homepage.acknowledgments.bailian.name" description="Bailian name">
                阿里云百炼大模型服务平台
              </Translate>
            </h3>
            <p className={styles.acknowledgmentDescription}>
              <Translate id="homepage.acknowledgments.bailian.description" description="Bailian acknowledgment">
                感谢阿里云百炼平台提供强大的大模型能力和完善的服务支持
              </Translate>
            </p>
            <a
              href="https://www.aliyun.com/product/bailian"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.acknowledgmentLink}
            >
              <Translate id="homepage.acknowledgments.learnMore" description="Learn more">
                了解更多
              </Translate>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.707 9.293a1 1 0 01-1.414 1.414L9 9.414V13a1 1 0 11-2 0V9.414L5.707 10.707a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3z"/>
              </svg>
            </a>
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
        <AcknowledgmentsSection />
      </main>
    </Layout>
  );
}
