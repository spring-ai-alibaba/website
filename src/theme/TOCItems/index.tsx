import React, { type ReactNode } from 'react'
import TOCItemsOriginal from '@theme-original/TOCItems'
import type TOCItemsType from '@theme/TOCItems'
import type { WrapperProps } from '@docusaurus/types'
import { useDoc } from '@docusaurus/plugin-content-docs/client'
import Translate from '@docusaurus/Translate'
import styles from './styles.module.css'

type Props = WrapperProps<typeof TOCItemsType>

function DocPageLinks(): ReactNode {
  const { metadata } = useDoc()
  const { editUrl } = metadata
  const issuesUrl = 'https://github.com/alibaba/spring-ai-alibaba/issues/new'

  return (
    <div className={styles.docPageLinks}>
      {editUrl && (
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <Translate
            id="theme.common.editThisPage"
            description="The link label to edit the current page"
          >
            编辑此页
          </Translate>
        </a>
      )}
      <a
        href={issuesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <Translate
          id="theme.common.reportAnIssue"
          description="The link label to report an issue for the current page"
        >
          问题反馈
        </Translate>
      </a>
    </div>
  )
}

class DocPageLinksErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

export default function TOCItemsWrapper(props: Props): ReactNode {
  return (
    <>
      <TOCItemsOriginal {...props} />
      <DocPageLinksErrorBoundary>
        <DocPageLinks />
      </DocPageLinksErrorBoundary>
    </>
  )
}
