import React, { useState } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import Link from '@docusaurus/Link'

interface AnnouncementBarProps {
  /**
   * 通知内容，支持 ReactNode 或 HTML 字符串
   */
  content?: React.ReactNode | string
  /**
   * 是否可关闭
   */
  closable?: boolean
  /**
   * 关闭后的回调
   */
  onClose?: () => void
}

export default function AnnouncementBar({
  content = (
    <span>
      Spring AI Alibaba 2.1.0.0 已发布，适配 Spring AI 2.1.0。
      <Link to="/docs/release-highlights">查看新特性与迁移指南</Link>
    </span>
  ),
  closable = true,
  onClose,
}: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) {
    return null
  }

  // 判断 content 是否是包含 HTML 标签的字符串
  const isHtmlString = typeof content === 'string' && /<[^>]+>/.test(content)

  return (
    <div className={styles.announcementBar}>
      <div className={clsx('container', styles.container)}>
        {isHtmlString ? (
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: content as string }}
          />
        ) : (
          <div className={styles.content}>
            {content}
          </div>
        )}
        {closable && (
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="关闭通知"
            title="关闭通知"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

