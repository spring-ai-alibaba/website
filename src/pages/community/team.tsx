import React from 'react'
import Layout from '@theme/Layout'
import Translate, { translate } from '@docusaurus/Translate'
import styles from './team.module.css'

// PMC member data
const pmcMembers = [
  {
    avatar: 'https://github.com/chickenlj.png',
    name: 'Jun Liu',
    organization: 'Alibaba',
    profile: 'https://github.com/chickenlj',
    termStart: '23rd Sep 2024',
  },
  {
    avatar: 'https://github.com/Cirilla-zmh.png',
    name: 'Minghui Zhang',
    organization: 'Alibaba',
    profile: 'https://github.com/Cirilla-zmh',
    termStart: '16th Dec 2024',
  },
  {
    avatar: 'https://github.com/CZJCC.png',
    name: 'Jianchuan Zhang',
    organization: 'Alibaba',
    profile: 'https://github.com/CZJCC',
    termStart: '16th Dec 2024',
    retired: true,
  },
  {
    avatar: 'https://github.com/robinyeeh.png',
    name: 'Tianbing Ye',
    organization: 'Alibaba',
    profile: 'https://github.com/robinyeeh',
    termStart: '9th Apr 2025',
    retired: true,
  },
  {
    avatar: 'https://github.com/yuluo-yx.png',
    name: 'Shown Ji',
    organization: '~',
    profile: 'https://github.com/yuluo-yx',
    termStart: '9th Apr 2025',
  },
    {
    avatar: 'https://github.com/disaster1-tesk.png',
    name: 'Wei Wang',
    organization: '~',
    profile: 'https://github.com/disaster1-tesk',
    termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/Aias00.png',
    name: 'Hongyu Liu  ',
    organization: '~',
    profile: 'https://github.com/Aias00',
    termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/GTyingzi.png',
    name: 'Tao Guo',
    organization: '~',
    profile: 'https://github.com/GTyingzi',
    termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/robocanic.png',
    name: 'Cai Chen',
    organization: '~',
    profile: 'https://github.com/robocanic',
    termStart: '24th Dec 2025',
  },
]

// Committer member data
const committerMembers = [
  {
    avatar: 'https://github.com/sincerity-being.png',
    name: 'Yuqiang He',
    profile: 'https://github.com/sincerity-being',
    termStart: '19th Feb 2025',
    retired: true,
  },
  {
    avatar: 'https://github.com/PolarishT.png',
    name: 'Zhenting Zhang',
    profile: 'https://github.com/PolarishT',
    termStart: '19th Feb 2025',
    retired: true,
  },
  {
    avatar: 'https://github.com/brianxiadong.png',
    name: 'Dong Xia',
    profile: 'https://github.com/brianxiadong',
    termStart: '9th Apr 2025',
    retired: true,
  },
  {
    avatar: 'https://github.com/CoderSerio.png',
    name: 'Yuyou Shen',
    profile: 'https://github.com/CoderSerio',
    termStart: '9th Apr 2025',
    retired: true,
  },
  {
    avatar: 'https://github.com/zhangshenghang.png',
    name: 'Shanghang Zhang',
    profile: 'https://github.com/zhangshenghang',
    termStart: '24th May 2025',
  },
  {
    avatar: 'https://github.com/HY-love-sleep.png',
    name: 'Hong Yan',
    profile: 'https://github.com/HY-love-sleep',
    termStart: '26th June 2025',
    retired: true,
  },
    {
    avatar: 'https://github.com/VLSMB.png',
    name: 'VLSMB',
    profile: 'https://github.com/VLSMB',
    termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/zxuexingzhijie.png',
    name: 'Makoto',
    profile: 'https://github.com/zxuexingzhijie',
    termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/Wangzy455.png',
    name: 'Ziyuan Wang',
    profile: 'https://github.com/Wangzy455',
     termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/xiaohai-78.png',
    name: 'Yuntao Xiao',
    profile: 'https://github.com/xiaohai-78',
        termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/SCMRCORE.png',
    name: 'Guo He',
    profile: 'https://github.com/SCMRCORE',
    termStart: '24th Dec 2025',
  },
    {
    avatar: 'https://github.com/guanxuc.png',
    name: 'Guan Xu',
    profile: 'https://github.com/guanxuc',
    termStart: '10th Jan 2026',
  },
]

// Split array into chunks of specified size
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export default function Team(): React.JSX.Element {
  const pmcChunks = chunkArray(pmcMembers, 2)
  const committerChunks = chunkArray(committerMembers, 2)

  return (
    <Layout
      title={translate({
        id: 'team.title',
        message: 'Spring AI Alibaba 社区角色介绍',
        description: 'The page title for team page',
      })}
      description={translate({
        id: 'team.description',
        message: '了解 Spring AI Alibaba 社区的角色和成员',
        description: 'The page description for team page',
      })}>
      <div className={styles.teamPage}>
        <div className="container">
          <div className={styles.teamHeader}>
            <h1 className={styles.teamTitle}>
              👥 <Translate id="team.pageTitle" description="Team page title">Spring AI Alibaba 团队</Translate>
            </h1>
            <p className={styles.teamDescription}>
              <Translate
                id="team.pageDescription"
                description="Team page description"
              >
                了解 Spring AI Alibaba 社区中不同角色的职责和标准，以及我们的团队成员。
              </Translate>
            </p>
          </div>

          {/* Part 1: Community contributor roles and relationships */}
          <div className={styles.rolesSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.mainSectionTitle}>
                🎯 <Translate id="team.rolesSection" description="Roles section title">社区贡献者角色</Translate>
              </h2>
              <p className={styles.mainSectionDescription}>
                <Translate id="team.rolesSectionDescription" description="Roles section description">
                  Spring AI Alibaba 社区采用分层的角色体系，每个角色都有明确的职责和晋升标准
                </Translate>
              </p>
            </div>

            {/* PMC role introduction */}
            <div className={styles.section}>
            <h2 className={styles.sectionTitle}><Translate id="team.pmc.title" description="PMC section title">Project Management Committee</Translate></h2>
            <div className={styles.sectionContent}>
              <p>
                <Translate id="team.pmc.intro" description="PMC introduction">
                  Project Management 作为 Spring AI Alibaba 项目的项目管理委员会，其成员是对 Spring AI Alibaba 项目的演进和发展做出显著贡献的个人，包含以下的标准：
                </Translate>
              </p>
              <div className={styles.standards}>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.pmc.coreDevTitle" description="PMC core development title">核心开发能力</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.pmc.coreDev1" description="PMC core development requirement 1">完成多个关键模块或者工程的设计与开发</Translate></li>
                    <li><Translate id="team.pmc.coreDev2" description="PMC core development requirement 2">是项目的核心开发人员</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.pmc.commitmentTitle" description="PMC commitment title">持续投入</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.pmc.commitment1" description="PMC commitment requirement 1">持续的投入和激情</Translate></li>
                    <li><Translate id="team.pmc.commitment2" description="PMC commitment requirement 2">积极参与社区、官网、Issue、PR等项目维护</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.pmc.influenceTitle" description="PMC influence title">社区影响力</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.pmc.influence1" description="PMC influence requirement 1">在社区中具有有目共睹的影响力</Translate></li>
                    <li><Translate id="team.pmc.influence2" description="PMC influence requirement 2">能够代表 Spring AI Alibaba 参加重要会议和活动</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.pmc.mentoringTitle" description="PMC mentoring title">人才培养</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.pmc.mentoring1" description="PMC mentoring requirement 1">具有培养 Committer 和 Contributor 的意识</Translate></li>
                    <li><Translate id="team.pmc.mentoring2" description="PMC mentoring requirement 2">具备培养人才的能力</Translate></li>
                  </ul>
                </div>
              </div>
              <p>
                <Translate id="team.pmc.election" description="PMC election process">
                  Project Management Member 在资深 Committer 中产生，由 Project Management 所有成员讨论以及投票产生，需要获得总人数的半数票以上才能当选。
                </Translate>
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}><Translate id="team.committer.title" description="Committer section title">Committer</Translate></h2>
            <div className={styles.sectionContent}>
              <p>
                <Translate id="team.committer.intro" description="Committer introduction">
                  Committer 是具有仓库写权限的个人，包含以下的标准：
                </Translate>
              </p>
              <div className={styles.standards}>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.committer.contributionTitle" description="Committer contribution title">持续贡献</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.committer.contribution1" description="Committer contribution requirement 1">能够在长时间内做持续贡献</Translate></li>
                    <li><Translate id="team.committer.contribution2" description="Committer contribution requirement 2">持续贡献 Issue、PR 的个人</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.committer.featureTitle" description="Committer feature title">重要功能贡献</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.committer.feature1" description="Committer feature requirement">对社区做出了重要 Feature 贡献</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.committer.participationTitle" description="Committer participation title">社区参与</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.committer.participation1" description="Committer participation requirement 1">参与 Issue 列表的维护</Translate></li>
                    <li><Translate id="team.committer.participation2" description="Committer participation requirement 2">重要 Feature 的讨论</Translate></li>
                    <li><Translate id="team.committer.participation3" description="Committer participation requirement 3">社区周会主持与参与社区周会分享</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.committer.quarterlyTitle" description="Committer quarterly title">季度计划参与</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.committer.quarterly1" description="Committer quarterly requirement">参加过至少 1 次的社区季度活跃贡献者计划</Translate></li>
                  </ul>
                </div>
                <div className={styles.standardsColumn}>
                  <h3 className={styles.standardsTitle}><Translate id="team.committer.reviewTitle" description="Committer review title">代码审查</Translate></h3>
                  <ul className={styles.standardsList}>
                    <li><Translate id="team.committer.review1" description="Committer review requirement">参与 code review</Translate></li>
                  </ul>
                </div>
              </div>
              <p>
                <Translate id="team.committer.election" description="Committer election process">
                  Committer 由 Steering Committee 成员提名投票产生，至少获得 3 票同意才能当选。
                </Translate>
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}><Translate id="team.contributor.title" description="Contributor section title">Contributor</Translate></h2>
            <div className={styles.sectionContent}>
              <p>
                <Translate id="team.contributor.intro" description="Contributor introduction">
                  Contributor 是对项目有贡献的个人，标准为：提交过 PR 并被合并。
                </Translate>
              </p>
            </div>
          </div>
          </div>

          {/* Part 2: Project governance members list */}
          <div className={styles.governanceSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.mainSectionTitle}>
                👨‍💼 <Translate id="team.governanceSection" description="Governance section title">项目治理人员</Translate>
              </h2>
              <p className={styles.mainSectionDescription}>
                <Translate id="team.governanceSectionDescription" description="Governance section description">
                  以下是 Spring AI Alibaba 项目的治理团队成员，他们负责项目的日常运营和重要决策
                </Translate>
              </p>
            </div>

            {/* PMC members list */}
            <div className={styles.section}>
              <h2><Translate id="team.pmcMembersTitle" description="PMC members title">Project Management Committee (PMC) Members</Translate></h2>
            <div className={styles.memberTable}>
              {pmcChunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex} className={styles.tableRow}>
                  {chunk.map((member, index) => (
                    <div key={index} className={styles.tableCell}>
                      <div className={styles.memberItem}>
                        <img
                          src={member.avatar}
                          alt={`${member.name} avatar`}
                          className={styles.memberAvatarSmall}
                        />
                        <div className={styles.memberInfo}>
                          <h4 className={styles.memberName}>
                            {member.name}
                            {member.retired && <span className={styles.retiredBadge}> (Retired)</span>}
                          </h4>
                          <p className={styles.memberOrg}>{member.organization}</p>
                          <a href={member.profile} className={styles.profileLink} target="_blank" rel="noopener noreferrer">
                            {member.profile.replace('https://github.com/', '@')}
                          </a>
                          <p className={styles.termStart}><Translate id="team.termStart" description="Term start label">Term Start</Translate>: {member.termStart}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Committer members list */}
          <div className={styles.section}>
            <h2><Translate id="team.committersTitle" description="Committers title">Committers</Translate></h2>
            <div className={styles.memberTable}>
              {committerChunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex} className={styles.tableRow}>
                  {chunk.map((member, index) => (
                    <div key={index} className={styles.tableCell}>
                      <div className={styles.memberItem}>
                        <img
                          src={member.avatar}
                          alt={`${member.name} avatar`}
                          className={styles.memberAvatarSmall}
                        />
                        <div className={styles.memberInfo}>
                          <h4 className={styles.memberName}>
                            {member.name}
                            {member.retired && <span className={styles.retiredBadge}> (Retired)</span>}
                          </h4>
                          <a href={member.profile} className={styles.profileLink} target="_blank" rel="noopener noreferrer">
                            {member.profile.replace('https://github.com/', '@')}
                          </a>
                          <p className={styles.termStart}><Translate id="team.termStart" description="Term start label">Term Start</Translate>: {member.termStart}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Join team section */}
          <div className={styles.joinTeam}>
            <div className={styles.joinCard}>
              <h2 className={styles.joinTitle}>
                🚀 <Translate id="team.joinUs" description="Join us title">想要加入我们吗？</Translate>
              </h2>
              <p className={styles.joinDescription}>
                <Translate
                  id="team.joinDescription"
                  description="Join team description"
                >
                  我们一直在寻找充满激情的贡献者来帮助改进这个项目。无论您是开发者、设计师、作者，还是只是热爱开源的人，我们的团队都有您的位置！
                </Translate>
              </p>
              <div className={styles.joinButtons}>
                <a
                  href="/community/contributing"
                  className="button button--primary button--lg"
                >
                  📖 <Translate id="team.contributingGuide" description="Contributing guide button">贡献指南</Translate>
                </a>
                <a
                  href="https://github.com/alibaba/spring-ai-alibaba/issues"
                  className="button button--secondary button--lg"
                >
                  🐛 <Translate id="team.viewIssues" description="View issues button">查看社区 Issue</Translate>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
