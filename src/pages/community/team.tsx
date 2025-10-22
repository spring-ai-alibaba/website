import React from 'react'
import Layout from '@theme/Layout'
import Translate, {translate} from '@docusaurus/Translate'
import styles from './team.module.css'

interface TeamMember {
  name: string
  role: string
  avatar: string
  bio: string
  github?: string
  twitter?: string
  website?: string
}

const TeamMembers: TeamMember[] = [
  {
    name: translate({
      id: 'team.yourName',
      message: '您的姓名',
      description: 'Your name placeholder'
    }),
    role: translate({
      id: 'team.creatorRole',
      message: '项目创建者 & 主要开发者',
      description: 'Creator and main developer role'
    }),
    avatar: '/img/team/avatar-placeholder.svg',
    bio: translate({
      id: 'team.creatorBio',
      message: '热衷于创建精美的文档和开发者体验。',
      description: 'Creator bio'
    }),
    github: 'https://github.com/your-username',
    twitter: 'https://twitter.com/your-handle',
    website: 'https://your-website.com',
  },
  {
    name: translate({
      id: 'team.contributorName',
      message: '贡献者姓名',
      description: 'Contributor name placeholder'
    }),
    role: translate({
      id: 'team.contributorRole',
      message: '核心贡献者',
      description: 'Core contributor role'
    }),
    avatar: '/img/team/avatar-placeholder.svg',
    bio: translate({
      id: 'team.contributorBio',
      message: '喜欢构建能帮助开发者提高效率的工具。',
      description: 'Contributor bio'
    }),
    github: 'https://github.com/contributor-username',
  },
  // Add more team members as needed
]

interface TeamMemberProps {
  name: string
  role: string
  avatar: string
  bio: string
  github?: string
  twitter?: string
  website?: string
}

function TeamMemberComponent({ name, role, avatar, bio, github, twitter, website }: TeamMemberProps): React.JSX.Element {
  return (
    <div className={styles.teamMember}>
      <div className={styles.memberCard}>
        <div className={styles.memberAvatar}>
          <img src={avatar} alt={`${name} avatar`} />
        </div>
        <div className={styles.memberInfo}>
          <h3 className={styles.memberName}>{name}</h3>
          <p className={styles.memberRole}>{role}</p>
          <p className={styles.memberBio}>{bio}</p>
          <div className={styles.memberLinks}>
            {github && (
              <a href={github} className={styles.socialLink} aria-label="GitHub">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            )}
            {twitter && (
              <a href={twitter} className={styles.socialLink} aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            )}
            {website && (
              <a href={website} className={styles.socialLink} aria-label="Website">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Team(): React.JSX.Element {
  return (
    <Layout
      title={translate({
        id: 'team.title',
        message: '我们的团队',
        description: 'The page title for team page'
      })}
      description={translate({
        id: 'team.description',
        message: '认识这个项目背后的优秀人才',
        description: 'The page description for team page'
      })}>
      <div className={styles.teamPage}>
        <div className="container">
          <div className={styles.teamHeader}>
            <h1 className={styles.teamTitle}>
              👥 <Translate id="team.pageTitle" description="Team page title">认识我们的团队</Translate>
            </h1>
            <p className={styles.teamDescription}>
              <Translate 
                id="team.pageDescription" 
                description="Team page description"
              >
                我们是一群充满激情的开发者、设计师和开源爱好者，致力于为社区构建卓越的工具。
              </Translate>
            </p>
          </div>
          
          <div className={styles.teamGrid}>
            {TeamMembers.map((member, index) => (
              <TeamMemberComponent key={index} {...member} />
            ))}
          </div>
          
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
                  href="https://github.com/your-username/your-project-name/issues" 
                  className="button button--secondary button--lg"
                >
                  🐛 <Translate id="team.viewIssues" description="View issues button">查看问题</Translate>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
