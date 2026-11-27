import React, { useCallback, useEffect, useRef, useState } from 'react'
import { translate } from '@docusaurus/Translate'
import { useActivePluginAndVersion } from '@docusaurus/plugin-content-docs/client'
import projectConfig from '../../../project.config'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import clsx from 'clsx'
import styles from './styles.module.css'

const PAGEFIND_ELEMENT_ID = 'pagefind-search-panel'
const PAGEFIND_SCRIPT_ID = 'pagefind-ui-script'
const PAGEFIND_STYLESHEET_ID = 'pagefind-ui-stylesheet'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface PagefindUIOptions {
  element: string;
  showImages?: boolean;
  showSubResults?: boolean;
  resetStyles?: boolean;
  excerptLength?: number;
  pageSize?: number;
  translations?: Record<string, string>;
}

interface PagefindUIInstance {
  triggerFilters(filters: Record<string, string>): void;
}

type PagefindUIConstructor = new (options: PagefindUIOptions) => PagefindUIInstance

declare global {
  interface Window {
    PagefindUI?: PagefindUIConstructor;
  }
}

let pagefindScriptLoad: Promise<void> | null = null

function appendStylesheet(href: string) {
  if (document.getElementById(PAGEFIND_STYLESHEET_ID)) {
    return
  }

  const stylesheet = document.createElement('link')
  stylesheet.id = PAGEFIND_STYLESHEET_ID
  stylesheet.rel = 'stylesheet'
  stylesheet.href = href
  document.head.appendChild(stylesheet)
}

function loadPagefindScript(src: string) {
  if (window.PagefindUI) {
    return Promise.resolve()
  }

  if (pagefindScriptLoad) {
    return pagefindScriptLoad
  }

  pagefindScriptLoad = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(PAGEFIND_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Pagefind UI 加载失败')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = PAGEFIND_SCRIPT_ID
    script.src = src
    script.async = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Pagefind UI 加载失败')), { once: true })
    document.body.appendChild(script)
  })

  return pagefindScriptLoad
}

export default function PagefindSearch() {
  const { i18n } = useDocusaurusContext()
  const version = useActivePluginAndVersion()?.activeVersion?.label
  // The build indexes all locales together, under the deployment base URL.
  const indexUrl = `${projectConfig.deployment.baseUrl}pagefind/`
  const scriptUrl = `${indexUrl}pagefind-ui.js`
  const stylesheetUrl = `${indexUrl}pagefind-ui.css`
  const [isOpen, setIsOpen] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl K')
  const pagefindRef = useRef<PagefindUIInstance | null>(null)

  const searchLabel = translate({
    id: 'theme.SearchBar.label',
    message: 'Search',
    description: 'The ARIA label and placeholder for search button',
  })

  const focusSearchInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>(`#${PAGEFIND_ELEMENT_ID} .pagefind-ui__search-input`)
        ?.focus()
    })
  }, [])

  const openSearch = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    const platform = window.navigator.platform.toLowerCase()
    setShortcutLabel(platform.includes('mac') ? '⌘ K' : 'Ctrl K')
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }

      if (event.key === 'Escape') {
        closeSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeSearch, openSearch])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const filters: Record<string, string> = version ? { Version: version } : {}
    if (pagefindRef.current) {
      pagefindRef.current.triggerFilters(filters)
      focusSearchInput()
      return
    }

    let cancelled = false
    setLoadState('loading')
    appendStylesheet(stylesheetUrl)

    loadPagefindScript(scriptUrl)
      .then(() => {
        if (cancelled) {
          return
        }

        const PagefindUI = window.PagefindUI
        if (!PagefindUI) {
          throw new Error('PagefindUI 未挂载到 window')
        }

        pagefindRef.current = new PagefindUI({
          element: `#${PAGEFIND_ELEMENT_ID}`,
          showImages: false,
          showSubResults: true,
          resetStyles: false,
          excerptLength: 30,
          pageSize: 8,
          translations: i18n.currentLocale === 'zh-Hans'
            ? {
              placeholder: '搜索文档、博客和页面',
              zero_results: '未找到与 [SEARCH_TERM] 相关的内容',
            }
            : {
              placeholder: 'Search docs, blog, and pages',
              zero_results: 'No results for [SEARCH_TERM]',
            },
        })

        pagefindRef.current.triggerFilters(filters)
        setLoadState('ready')
        focusSearchInput()
      })
      .catch((error) => {
        console.warn(error)
        if (!cancelled) {
          setLoadState('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [focusSearchInput, i18n.currentLocale, isOpen, scriptUrl, stylesheetUrl, version])

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeSearch()
    }
  }

  return (
    <div className={styles.searchContainer} role="search">
      <button
        type="button"
        className={styles.searchButton}
        onClick={openSearch}
        aria-label={searchLabel}
        title={`${searchLabel} (${shortcutLabel})`}
      >
        <svg className={styles.searchIcon} viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="m14.2 13.1 3.1 3.1-1.1 1.1-3.1-3.1a6.6 6.6 0 1 1 1.1-1.1Zm-5.1.3a4.9 4.9 0 1 0 0-9.8 4.9 4.9 0 0 0 0 9.8Z"
            fill="currentColor"
          />
        </svg>
        <span className={styles.searchButtonText}>{searchLabel}</span>
        <kbd className={styles.searchShortcut}>{shortcutLabel}</kbd>
      </button>

      <div
        className={clsx(styles.searchOverlay, isOpen && styles.searchOverlayOpen)}
        aria-hidden={!isOpen}
        onMouseDown={handleOverlayMouseDown}
      >
        <div
          className={styles.searchDialog}
          role="dialog"
          aria-modal="true"
          aria-label={searchLabel}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className={styles.searchHeader}>
            <div>
              <h2 className={styles.searchTitle}>{searchLabel}</h2>
              <p className={styles.searchDescription}>
                {i18n.currentLocale === 'zh-Hans'
                  ? '搜索站内文档、博客与页面内容'
                  : 'Search documentation, blog posts, and pages'}
              </p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeSearch}
              aria-label={i18n.currentLocale === 'zh-Hans' ? '关闭搜索' : 'Close search'}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {loadState === 'loading' && (
            <div className={styles.searchStatus}>
              {i18n.currentLocale === 'zh-Hans' ? '正在加载搜索索引...' : 'Loading search index...'}
            </div>
          )}

          {loadState === 'error' && (
            <div className={clsx(styles.searchStatus, styles.searchError)}>
              {i18n.currentLocale === 'zh-Hans'
                ? '搜索索引尚未生成。请先运行 npm run build。'
                : 'The search index is not available. Run npm run build first.'}
            </div>
          )}

          <div id={PAGEFIND_ELEMENT_ID} className={styles.pagefindPanel} />

          <div className={styles.searchFooter}>
            <span>Pagefind</span>
            <span className={styles.footerShortcut}>Esc</span>
          </div>
        </div>
      </div>
    </div>
  )
}
