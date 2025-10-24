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
            {/* 合并的分组：感谢和如何贡献 */}
            <div className={styles.gridSection}>
              <div className={styles.gridCard}>
                <div className={styles.cardIcon}>🚀</div>
                <h3 className={styles.cardTitle}>欢迎贡献</h3>
                <div className={styles.cardContent}>
                  <p>
                    <Translate 
                      id="contributing.thanksText" 
                      description="Thanks text"
                    >
                      Spring AI Alibaba 从开源建设以来，受到了很多社区同学的关注。社区的每一个 Issue ，每一个 PR，都是对整个项目的帮助，都在为建设更好用的 Spring AI 添砖加瓦。
                    </Translate>
                  </p>
                  <p>
                    <Translate 
                      id="contributing.thanksText2" 
                      description="Thanks text 2"
                    >
                      我们真心地感谢为这个项目提出过 Issue 和 PR 的开发者。我们希望有更多社区的开发者加入进来，一起把项目做好。
                    </Translate>
                  </p>
                  <p>
                    <Translate 
                      id="contributing.introText" 
                      description="Introduction text"
                    >
                      在贡献代码之前，请您稍微花一些时间了解为 Spring AI Alibaba 贡献代码的流程。
                    </Translate>
                  </p>
                </div>
              </div>
            </div>

            {/* 4方格布局 */}
            <div className={styles.gridContainer}>
              {/* 第一行 */}
              <div className={styles.gridRow}>
                {/* 贡献类型 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>💡</div>
                  <h3 className={styles.cardTitle}>贡献类型</h3>
                  <div className={styles.cardContent}>
                    <p>
                      <Translate 
                        id="contributing.whatText" 
                        description="What to contribute text"
                      >
                        我们随时都欢迎任何贡献，无论是简单的错别字修正，BUG 修复还是增加新功能。请踊跃提出问题或发起 PR。我们同样重视文档以及与其它开源项目的整合，欢迎在这方面做出贡献。
                      </Translate>
                    </p>
                    <p>
                      <Translate 
                        id="contributing.complexChanges" 
                        description="Complex changes text"
                      >
                        如果是一个比较复杂的修改，建议先在 Issue 中添加一个 Feature 标识，并简单描述一下设计和修改点。
                      </Translate>
                    </p>
                  </div>
                </div>

                {/* 代码开发 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>💻</div>
                  <h3 className={styles.cardTitle}>代码开发</h3>
                  <div className={styles.cardContent}>
                    <p>
                      开发自己的功能，<strong>开发完毕后建议使用 <code>mvn clean package</code> 命令确保能修改后的代码能在本地编译通过。执行该命令的同时还能以 spring 的方式自动格式化代码</strong>。然后再提交代码，提交代码之前请注意创建一个新的有关本特性的分支，用该分支进行代码提交。
                    </p>
                  </div>
                </div>
              </div>

              {/* 第二行 */}
              <div className={styles.gridRow}>
                {/* 代码质量检查 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>✅</div>
                  <h3 className={styles.cardTitle}>代码质量检查</h3>
                  <div className={styles.cardContent}>
                    <p>
                      本地 boe 环境开发完成后，强烈建议在提交 PR 之前执行项目 <code>tools\make</code> 提供的 <code>make</code> 命令进行本地持续集成（CI）检查，以确保代码符合项目的标准和规范。如果对于本地CI有任何疑问，可以在控制台输入 <code>make help</code> 了解具体信息。
                    </p>
                  </div>
                </div>

                {/* 代码规范 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>🔍</div>
                  <h3 className={styles.cardTitle}>代码规范</h3>
                  <div className={styles.cardContent}>
                    <p>
                      为了减少一些不必要的代码风格问题，Spring AI Alibaba 提供了本地 Checkstyle 检查功能。可以在项目根目录下执行 <code>mvn checkstyle:check</code> 命令来检查代码风格是否符合规范。
                    </p>
                  </div>
                </div>
              </div>

              {/* 第三行 */}
              <div className={styles.gridRow}>
                {/* 代码清理 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>🧹</div>
                  <h3 className={styles.cardTitle}>代码清理</h3>
                  <div className={styles.cardContent}>
                    <p>
                      为了确保代码的整洁，请删除 Java 文件中未使用的导入。可以通过执行 <code>mvn spotless:apply</code> 命令来自动删除未使用的导入。
                    </p>
                  </div>
                </div>

                {/* 代码提交 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>📝</div>
                  <h3 className={styles.cardTitle}>代码提交</h3>
                  <div className={styles.cardContent}>
                    <p>
                      在编码完成之后，需要基于 pr 规范 <code>[lint-pr-title.yml](.github/workflows/lint-pr-title.yml)</code> 对提交信息进行 format & check，确保提交信息符合规范。
                    </p>
                    <p>
                      Commit 规范: <code>git commit -m "类型(模块): 空格 符合规范的提交信息"</code>, 例如 <code>feat(docs): contribute-zh 更新</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* 第四行 */}
              <div className={styles.gridRow}>
                {/* PR 提交 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>🎉</div>
                  <h3 className={styles.cardTitle}>PR 提交</h3>
                  <div className={styles.cardContent}>
                    <p>
                      提交 PR，根据 <code>Pull request template</code> 写明修改点和实现的功能，等待 code review 和 合并，成为 Spring AI Alibaba Contributor，为更好用的 Spring AI Alibaba 做出贡献。
                    </p>
                  </div>
                </div>

                {/* 代码合并 */}
                <div className={styles.gridCard}>
                  <div className={styles.cardIcon}>🔄</div>
                  <h3 className={styles.cardTitle}>代码合并</h3>
                  <div className={styles.cardContent}>
                    <p>
                      <Translate 
                        id="contributing.mergeBeforePRText" 
                        description="Merge before PR text"
                      >
                        同样，提交 PR 前，需要 rebase main 分支的代码（如果您的目标分支不是 main 分支，则需要 rebase 对应目标分支），具体操作步骤请参考之前的章节。
                      </Translate>
                    </p>
                    <p>
                      <Translate 
                        id="contributing.conflictResolution" 
                        description="Conflict resolution text"
                      >
                        如果出现冲突，需要先解决冲突。
                      </Translate>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 行为准则 */}
            <div className={styles.gridSection}>
              <div className={styles.gridCard}>
                <div className={styles.cardIcon}>📜</div>
                <h3 className={styles.cardTitle}>行为准则</h3>
                <div className={styles.cardContent}>
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
