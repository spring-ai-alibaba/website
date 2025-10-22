import React from 'react'
import clsx from 'clsx'
import Translate, {translate} from '@docusaurus/Translate'
import styles from './styles.module.css'

interface FeatureItem {
  title: string
  icon: string
  description: React.JSX.Element
}

const FeatureList: FeatureItem[] = [
  {
    title: translate({
      id: 'homepage.features.docs.title',
      message: '📚 丰富文档',
      description: 'Feature title for rich documentation'
    }),
    icon: '📖',
    description: (
      <Translate
        id="homepage.features.docs.description"
        description="Feature description for rich documentation">
        包含示例、教程和 API 参考的全面文档。
        您需要的一切，从入门到精通您的项目。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.theme.title',
      message: '🎨 精美主题',
      description: 'Feature title for beautiful themes'
    }),
    icon: '🌓',
    description: (
      <Translate
        id="homepage.features.theme.description"
        description="Feature description for beautiful themes">
        支持双主题，优雅的纸张米白色亮色主题和绚丽的
        星空黑色暗色主题。在主题间无缝切换。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.fast.title',
      message: '⚡ 快速现代',
      description: 'Feature title for fast and modern'
    }),
    icon: '🚀',
    description: (
      <Translate
        id="homepage.features.fast.description"
        description="Feature description for fast and modern">
        使用现代技术构建，实现闪电般的快速性能。
        响应式设计，在所有设备上都能完美工作。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.customizable.title',
      message: '🔧 易于定制',
      description: 'Feature title for easy customization'
    }),
    icon: '⚙️',
    description: (
      <Translate
        id="homepage.features.customizable.description"
        description="Feature description for easy customization">
        高度可定制的组件和主题。易于修改颜色、
        字体、布局，并添加您自己的品牌元素。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.mobile.title',
      message: '📱 移动优先',
      description: 'Feature title for mobile first'
    }),
    icon: '📱',
    description: (
      <Translate
        id="homepage.features.mobile.description"
        description="Feature description for mobile first">
        响应式设计，在手机、平板和桌面设备上都很美观。
        触摸友好的导航和交互体验。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.search.title',
      message: '🔍 搜索功能',
      description: 'Feature title for search functionality'
    }),
    icon: '🔎',
    description: (
      <Translate
        id="homepage.features.search.description"
        description="Feature description for search functionality">
        内置搜索功能，帮助用户快速找到内容。
        智能搜索，具有自动完成和建议功能。
      </Translate>
    ),
  },
]

interface FeatureProps {
  icon: string
  title: string
  description: React.JSX.Element
}

function Feature({ icon, title, description }: FeatureProps): React.JSX.Element {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon}>
          <span className={styles.iconEmoji}>{icon}</span>
        </div>
        <div className={styles.featureContent}>
          <h3 className={styles.featureTitle}>{title}</h3>
          <p className={styles.featureDescription}>{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): React.JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>
            <Translate id="homepage.features.title" description="Features section title">
              ✨ 强大功能
            </Translate>
          </h2>
          <p className={styles.featuresSubtitle}>
            <Translate id="homepage.features.subtitle" description="Features section subtitle">
              创建精美文档网站所需的一切功能
            </Translate>
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
