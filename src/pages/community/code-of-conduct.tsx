import React from 'react'
import Layout from '@theme/Layout'
import Translate, { translate } from '@docusaurus/Translate'
import styles from './code-of-conduct.module.css'

export default function CodeOfConduct(): React.JSX.Element {
  return (
    <Layout
      title={translate({
        id: 'codeOfConduct.title',
        message: '行为准则',
        description: 'The page title for code of conduct',
      })}
      description={translate({
        id: 'codeOfConduct.description',
        message: '我们社区的行为准则和价值观',
        description: 'The page description for code of conduct',
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
                🎯 <Translate id="codeOfConduct.ourCommitment" description="Our commitment section title">贡献者行为准则</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <p>
                  <Translate 
                    id="codeOfConduct.commitmentText" 
                    description="Our commitment text"
                  >
                    作为本项目的贡献者和维护者，为了促进开放和欢迎的社区，我们承诺尊重所有通过报告问题、发布功能请求、更新文档、提交拉取请求或补丁以及其他活动做出贡献的人。
                  </Translate>
                </p>
                <p>
                  <Translate 
                    id="codeOfConduct.commitmentText2" 
                    description="Our commitment text 2"
                  >
                    我们致力于让参与本项目的每个人都能获得无骚扰的体验，无论经验水平、性别、性别认同和表达、性取向、残疾、个人外貌、体型、种族、民族、年龄、宗教或国籍如何。
                  </Translate>
                </p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                ❌ <Translate id="codeOfConduct.unacceptableBehavior" description="Unacceptable behavior title">不可接受的行为示例</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <ul className={styles.standardsList}>
                  <li><Translate id="codeOfConduct.sexualizedLanguage" description="Using sexualized language">使用性暗示语言或图像</Translate></li>
                  <li><Translate id="codeOfConduct.personalAttacks" description="Personal attacks">人身攻击</Translate></li>
                  <li><Translate id="codeOfConduct.trollingInsults" description="Trolling and insulting comments">恶意挑衅或侮辱/贬低性评论</Translate></li>
                  <li><Translate id="codeOfConduct.harassment" description="Public or private harassment">公开或私下骚扰</Translate></li>
                  <li><Translate id="codeOfConduct.publishingInfo" description="Publishing private information">未经明确许可发布他人的私人信息，例如物理或电子地址</Translate></li>
                  <li><Translate id="codeOfConduct.otherConduct" description="Other inappropriate conduct">其他不道德或不专业的行为</Translate></li>
                </ul>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                🛡️ <Translate id="codeOfConduct.enforcement" description="Enforcement section title">维护者责任</Translate>
              </h2>
              <div className={styles.sectionContent}>
                <p>
                  <Translate 
                    id="codeOfConduct.enforcementText" 
                    description="Enforcement responsibility text"
                  >
                    项目维护者有权和责任删除、编辑或拒绝与此行为准则不符的评论、提交、代码、wiki编辑、问题和其他贡献，或暂时或永久禁止任何贡献者，因为他们认为其他行为不当、具有威胁性、冒犯性或有害。
                  </Translate>
                </p>
                <p>
                  <Translate 
                    id="codeOfConduct.enforcementText2" 
                    description="Enforcement responsibility text 2"
                  >
                    通过采用此行为准则，项目维护者承诺公平一致地将这些原则应用于管理此项目的各个方面。不遵循或执行行为准则的项目维护者可能会被永久从项目团队中移除。
                  </Translate>
                </p>
                <p>
                  <Translate 
                    id="codeOfConduct.enforcementText3" 
                    description="Enforcement responsibility text 3"
                  >
                    此行为准则适用于项目空间内以及个人代表项目或其社区时的公共空间。
                  </Translate>
                </p>
              </div>
            </div>

            {/* <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                📞 <Translate id="codeOfConduct.reporting" description="Reporting section title">报告不当行为</Translate>
              </h2>
              <div className={styles.reportingCard}>
                <div className={styles.reportingContent}>
                  <h3><Translate id="codeOfConduct.howToReport" description="How to report title">如何报告</Translate></h3>
                  <p>
                    <Translate id="codeOfConduct.reportingInstructions" description="Reporting instructions">
                      虐待、骚扰或其他不可接受行为的实例可以通过联系项目维护者来报告：
                    </Translate>
                  </p>
                  <div className={styles.contactMethods}>
                    <a href="mailto:" className={styles.contactMethod}>
                      📧 todo: 添加邮箱地址
                    </a>
                  </div>
                  <p className={styles.reportingNote}>
                    <Translate 
                      id="codeOfConduct.confidentiality" 
                      description="Confidentiality note"
                    >
                      所有投诉都将被审查和调查，并将产生被认为必要和适合情况的回应。维护者有义务为事件报告者保密。
                    </Translate>
                  </p>
                </div>
              </div>
            </div> */}

            <div className={styles.attribution}>
              <p>
                <Translate 
                  id="codeOfConduct.attribution" 
                  description="Code of conduct attribution"
                >
                  此行为准则改编自
                </Translate>{' '}
                <a href="http://contributor-covenant.org">
                  <Translate id="codeOfConduct.contributorCovenant" description="Contributor Covenant link text">贡献者公约</Translate>
                </a>
                <Translate id="codeOfConduct.version" description="Version info">
                  ，版本 1.3.0，可在
                </Translate>{' '}
                <a href="http://contributor-covenant.org/version/1/3/0/">
                  http://contributor-covenant.org/version/1/3/0/
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
