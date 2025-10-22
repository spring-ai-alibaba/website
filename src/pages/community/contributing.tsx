import React from 'react'
import Layout from '@theme/Layout'
import Translate, {translate} from '@docusaurus/Translate'
import styles from './contributing.module.css'

export default function Contributing(): React.JSX.Element {
  return (
    <Layout
      title={translate({
        id: 'contributing.title',
        message: '贡献指南',
        description: 'The page title for contributing guide'
      })}
      description={translate({
        id: 'contributing.description',
        message: '了解如何为项目做贡献',
        description: 'The page description for contributing guide'
      })}>
      <div className={styles.contributingPage}>
        <div className="container">
          <div className={styles.contributingHeader}>
            <h1 className={styles.contributingTitle}>
              🤝 <Translate id="contributing.pageTitle" description="Contributing page title">贡献指南</Translate>
            </h1>
            <p className={styles.contributingDescription}>
              <Translate 
                id="contributing.pageDescription" 
                description="Contributing page description"
              >
                感谢考虑为我们的项目做贡献！每一个贡献都是有价值的，无论大小，我们都深表感谢。
              </Translate>
            </p>
          </div>

          <div className={styles.contributingContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                🚀 <Translate id="contributing.quickStart" description="Quick start section title">快速开始</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <ol className={styles.stepsList}>
                  <li><Translate id="contributing.step1" description="Fork repository step">Fork 项目仓库</Translate></li>
                  <li><Translate id="contributing.step2" description="Create branch step">创建功能分支</Translate> (<code>git checkout -b feature/AmazingFeature</code>)</li>
                  <li><Translate id="contributing.step3" description="Commit changes step">提交更改</Translate> (<code>git commit -m 'Add some AmazingFeature'</code>)</li>
                  <li><Translate id="contributing.step4" description="Push branch step">推送到分支</Translate> (<code>git push origin feature/AmazingFeature</code>)</li>
                  <li><Translate id="contributing.step5" description="Open PR step">开启一个 Pull Request</Translate></li>
                </ol>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                💡 <Translate id="contributing.contributionTypes" description="Contribution types section title">贡献类型</Translate>
              </h2>
              <div className={styles.contributionTypes}>
                <div className={styles.typeCard}>
                  <div className={styles.typeIcon}>🐛</div>
                  <h3><Translate id="contributing.bugFixes" description="Bug fixes card title">错误修复</Translate></h3>
                  <p><Translate id="contributing.bugFixesDesc" description="Bug fixes description">帮助修复项目中的错误和问题</Translate></p>
                </div>
                <div className={styles.typeCard}>
                  <div className={styles.typeIcon}>✨</div>
                  <h3><Translate id="contributing.newFeatures" description="New features card title">新功能</Translate></h3>
                  <p><Translate id="contributing.newFeaturesDesc" description="New features description">添加新功能或改进现有功能</Translate></p>
                </div>
                <div className={styles.typeCard}>
                  <div className={styles.typeIcon}>📚</div>
                  <h3><Translate id="contributing.documentation" description="Documentation card title">文档</Translate></h3>
                  <p><Translate id="contributing.documentationDesc" description="Documentation description">改进文档、教程和示例</Translate></p>
                </div>
                <div className={styles.typeCard}>
                  <div className={styles.typeIcon}>🎨</div>
                  <h3><Translate id="contributing.design" description="Design card title">设计</Translate></h3>
                  <p><Translate id="contributing.designDesc" description="Design description">改进用户界面和用户体验</Translate></p>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                📋 <Translate id="contributing.developmentSetup" description="Development setup section title">开发设置</Translate>
              </h2>
              <div className={styles.codeBlock}>
                <pre>
                  <code>
{`# ${translate({
  id: 'contributing.cloneRepo',
  message: '克隆仓库',
  description: 'Clone repository comment'
})}
git clone https://github.com/your-username/your-project-name.git

# ${translate({
  id: 'contributing.enterDirectory',
  message: '进入项目目录',
  description: 'Enter directory comment'
})}
cd your-project-name

# ${translate({
  id: 'contributing.installDeps',
  message: '安装依赖',
  description: 'Install dependencies comment'
})}
npm install

# ${translate({
  id: 'contributing.startDev',
  message: '启动开发服务器',
  description: 'Start development server comment'
})}
npm start`}
                  </code>
                </pre>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                📜 <Translate id="contributing.codeOfConduct" description="Code of conduct section title">行为准则</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <p>
                  <Translate 
                    id="contributing.codeOfConductText" 
                    description="Code of conduct reference text"
                  >
                    参与此项目即表示同意遵守我们的
                  </Translate>{' '}
                  <a href="/community/code-of-conduct">
                    <Translate id="contributing.codeOfConductLink" description="Code of conduct link text">行为准则</Translate>
                  </a>
                  <Translate id="contributing.friendlyInteraction" description="Friendly interaction reminder">
                    。请确保互动保持友善、尊重和包容。
                  </Translate>
                </p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                ❓ <Translate id="contributing.needHelp" description="Need help section title">需要帮助？</Translate>
              </h2>
              <div className={styles.helpLinks}>
                <a href="https://github.com/your-username/your-project-name/discussions" className={styles.helpLink}>
                  💬 <Translate id="contributing.githubDiscussions" description="GitHub discussions link">GitHub 讨论</Translate>
                </a>
                <a href="https://github.com/your-username/your-project-name/issues" className={styles.helpLink}>
                  🐛 <Translate id="contributing.reportIssue" description="Report issue link">报告问题</Translate>
                </a>
                <a href="/community/team" className={styles.helpLink}>
                  👥 <Translate id="contributing.contactTeam" description="Contact team link">联系团队</Translate>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
