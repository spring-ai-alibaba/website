import React from 'react'
import Layout from '@theme/Layout'
import Translate, {translate} from '@docusaurus/Translate'
import styles from './code-of-conduct.module.css'

export default function CodeOfConduct(): React.JSX.Element {
  return (
    <Layout
      title={translate({
        id: 'codeOfConduct.title',
        message: '行为准则',
        description: 'The page title for code of conduct'
      })}
      description={translate({
        id: 'codeOfConduct.description',
        message: '我们社区的行为准则和价值观',
        description: 'The page description for code of conduct'
      })}>
      <div className={styles.codePage}>
        <div className="container">
          <div className={styles.codeHeader}>
            <h1 className={styles.codeTitle}>
              📜 <Translate id="codeOfConduct.pageTitle" description="Code of conduct page title">贡献者行为准则</Translate>
            </h1>
            <p className={styles.codeDescription}>
              <Translate 
                id="codeOfConduct.pageDescription" 
                description="Code of conduct page description"
              >
                我们致力于为每个人提供友善、安全和欢迎的环境，无论性别、性取向、残疾、民族、宗教或其他个人特征。
              </Translate>
            </p>
          </div>

          <div className={styles.codeContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                🎯 <Translate id="codeOfConduct.ourCommitment" description="Our commitment section title">我们的承诺</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <p>
                  <Translate 
                    id="codeOfConduct.commitmentText" 
                    description="Our commitment text"
                  >
                    为了营造开放、欢迎的环境，我们作为贡献者和维护者承诺：让参与我们项目和社区的每个人都不受骚扰，无论年龄、体型、残疾、民族、性别特征、性别认同、经验水平、教育程度、社会经济地位、国籍、个人形象、种族、宗教或性取向如何。
                  </Translate>
                </p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                ✅ <Translate id="codeOfConduct.ourStandards" description="Our standards section title">我们的标准</Translate>
              </h2>
              <div className={styles.standards}>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}>
                    <Translate id="codeOfConduct.positiveBehavior" description="Positive behavior title">积极行为包括：</Translate>
                  </h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="codeOfConduct.welcomingLanguage" description="Using welcoming language">使用欢迎和包容性语言</Translate></li>
                    <li><Translate id="codeOfConduct.respectingViewpoints" description="Respecting differing viewpoints">尊重不同的观点和经历</Translate></li>
                    <li><Translate id="codeOfConduct.acceptingCriticism" description="Gracefully accepting criticism">优雅地接受建设性批评</Translate></li>
                    <li><Translate id="codeOfConduct.focusingCommunity" description="Focusing on community">专注于对社区最有利的事情</Translate></li>
                    <li><Translate id="codeOfConduct.showingEmpathy" description="Showing empathy">对其他社区成员表示同理心</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}>
                    <Translate id="codeOfConduct.unacceptableBehavior" description="Unacceptable behavior title">不可接受的行为包括：</Translate>
                  </h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="codeOfConduct.sexualizedLanguage" description="Using sexualized language">使用色情化语言或图像</Translate></li>
                    <li><Translate id="codeOfConduct.trollingInsults" description="Trolling and insulting comments">恶意评论、侮辱或人身攻击</Translate></li>
                    <li><Translate id="codeOfConduct.harassment" description="Public or private harassment">公开或私下骚扰</Translate></li>
                    <li><Translate id="codeOfConduct.publishingInfo" description="Publishing private information">发布他人隐私信息</Translate></li>
                    <li><Translate id="codeOfConduct.otherConduct" description="Other inappropriate conduct">其他不合适的专业行为</Translate></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                🛡️ <Translate id="codeOfConduct.enforcement" description="Enforcement section title">执行责任</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <p>
                  <Translate 
                    id="codeOfConduct.enforcementText" 
                    description="Enforcement responsibility text"
                  >
                    项目维护者有责任澄清可接受行为的标准，并采取适当和公平的纠正措施来回应任何不可接受的行为。项目维护者有权删除、编辑或拒绝与此行为准则不符的评论、提交、代码、wiki编辑、问题和其他贡献。
                  </Translate>
                </p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                📞 <Translate id="codeOfConduct.reporting" description="Reporting section title">报告</Translate>
              </h2>
              <div className={styles.reportingCard}>
                <div className={styles.reportingContent}>
                  <h3><Translate id="codeOfConduct.howToReport" description="How to report title">如何报告不当行为</Translate></h3>
                  <p>
                    <Translate id="codeOfConduct.reportingInstructions" description="Reporting instructions">
                      如果遇到或目睹了不当行为，请联系项目团队：
                    </Translate>
                  </p>
                  <div className={styles.contactMethods}>
                    <a href="mailto:conduct@your-project.com" className={styles.contactMethod}>
                      📧 conduct@your-project.com
                    </a>
                    <a href="https://github.com/your-username/your-project-name/issues" className={styles.contactMethod}>
                      🐛 GitHub Issues
                    </a>
                  </div>
                  <p className={styles.reportingNote}>
                    <Translate 
                      id="codeOfConduct.confidentiality" 
                      description="Confidentiality note"
                    >
                      所有投诉都将被审查和调查，并将产生被认为必要和适合情况的回应。项目团队有义务为事件报告者保密。
                    </Translate>
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                ⚖️ <Translate id="codeOfConduct.enforcementTitle" description="Enforcement title">执行</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <p>
                  <Translate 
                    id="codeOfConduct.consequences" 
                    description="Enforcement consequences"
                  >
                    不遵循或执行行为准则的项目维护者可能面临项目领导层其他成员确定的临时或永久后果。
                  </Translate>
                </p>
              </div>
            </div>

            <div className={styles.attribution}>
              <p>
                <Translate 
                  id="codeOfConduct.attribution" 
                  description="Code of conduct attribution"
                >
                  此行为准则改编自
                </Translate>{' '}
                <a href="https://www.contributor-covenant.org">
                  <Translate id="codeOfConduct.contributorCovenant" description="Contributor Covenant link text">贡献者公约</Translate>
                </a>
                <Translate id="codeOfConduct.version" description="Version info">
                  ，版本 2.0，可在
                </Translate>{' '}
                <a href="https://www.contributor-covenant.org/version/2/0/code_of_conduct.html">
                  https://www.contributor-covenant.org/version/2/0/code_of_conduct.html
                </a>{' '}
                <Translate id="codeOfConduct.available" description="Available text">获取。</Translate>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
