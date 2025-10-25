import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useHistory } from '@docusaurus/router'
import styles from './styles.module.css'

interface Version {
  name: string
  label: string
  path: string
  banner: 'none' | 'unreleased' | 'unmaintained'
  badge?: boolean
}

// Define version configurations for each framework
const frameworkVersions: Record<string, Version[]> = {
  'agent-framework': [
    { name: 'current', label: '2.0.x (Current)', path: 'current', banner: 'none', badge: true },
    { name: '1.x', label: '1.x', path: '1.x', banner: 'none' },
  ],
  'graph-core': [
    { name: 'current', label: '2.0.x (Current)', path: 'current', banner: 'none', badge: true },
    { name: '1.x', label: '1.x', path: '1.x', banner: 'none' },
  ],
}

const VersionDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const history = useHistory()

  // Detect current locale
  const getCurrentLocale = (): 'zh-Hans' | 'en' => {
    if (currentPath.startsWith('/en/')) {
      return 'en'
    }
    return 'zh-Hans'
  }

  // Internationalization texts
  const i18n = {
    'zh-Hans': {
      versionLabel: '版本',
      latest: 'Latest',
    },
    'en': {
      versionLabel: 'Version',
      latest: 'Latest',
    },
  }

  // Find or create portal container
  useEffect(() => {
    const findOrCreatePortal = () => {
      const navbar = document.querySelector('.navbar__items--right')
      if (navbar) {
        let container = document.querySelector('#version-dropdown-portal') as HTMLElement
        if (!container) {
          container = document.createElement('div')
          container.id = 'version-dropdown-portal'
          container.className = 'navbar__item navbar__version-dropdown-portal'
          // Insert before language selector
          const localeDropdown = navbar.querySelector('.navbar__item.dropdown')
          if (localeDropdown) {
            navbar.insertBefore(container, localeDropdown)
          } else {
            navbar.appendChild(container)
          }
        }
        setPortalContainer(container)
      }
    }

    findOrCreatePortal()

    // Listen for DOM changes to ensure portal container always exists
    const observer = new MutationObserver(() => {
      if (!document.querySelector('#version-dropdown-portal')) {
        findOrCreatePortal()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  // Update current path
  useEffect(() => {
    const updatePath = () => {
      setCurrentPath(window.location.pathname)
    }

    updatePath()

    // Listen for route changes
    window.addEventListener('popstate', updatePath)

    const observer = new MutationObserver(() => {
      updatePath()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      window.removeEventListener('popstate', updatePath)
      observer.disconnect()
    }
  }, [])

  // Detect if currently on agent-framework or graph-core documentation pages
  const getCurrentFramework = (): string | null => {
    if (currentPath.includes('/docs/frameworks/agent-framework')) {
      return 'agent-framework'
    }
    if (currentPath.includes('/docs/frameworks/graph-core')) {
      return 'graph-core'
    }
    return null
  }

  const framework = getCurrentFramework()

  // Get current version
  const getCurrentVersion = (): string => {
    if (!framework) return 'current'
    const versions = frameworkVersions[framework]

    for (const version of versions) {
      if (currentPath.includes(`/${version.path}`)) {
        return version.name
      }
    }
    return 'current'
  }

  const currentVersion = getCurrentVersion()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Don't show if not on agent-framework or graph-core pages
  if (!framework || !portalContainer) {
    return null
  }

  const versions = frameworkVersions[framework]
  const currentVersionObj = versions.find(v => v.name === currentVersion) || versions[0]
  const locale = getCurrentLocale()
  const t = i18n[locale]

  const handleVersionChange = (versionPath: string) => {
    // Get the sub-path after the version path in current page
    const localePrefix = locale === 'en' ? '/en' : ''
    const basePath = `${localePrefix}/docs/frameworks/${framework}`

    // Extract sub-path after current version
    // For example: from /docs/frameworks/agent-framework/current/guides/introduction
    // Extract /guides/introduction
    let subPath = ''
    const currentVersionPath = `${basePath}/${currentVersion}`
    if (currentPath.startsWith(currentVersionPath)) {
      subPath = currentPath.substring(currentVersionPath.length)
    }

    // If no sub-path, default to quick-start
    if (!subPath || subPath === '/' || subPath === '') {
      subPath = '/quick-start'
    }

    // Build new URL, keep sub-path
    const newPath = `${basePath}/${versionPath}${subPath}`

    // Use Docusaurus history API for navigation without full page refresh
    history.push(newPath)
    setIsOpen(false)
  }

  const dropdownContent = (
    <div className={styles.versionDropdown} ref={dropdownRef}>
      <button
        className={styles.versionButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select version"
      >
        <span className={styles.versionLabel}>{t.versionLabel}: {currentVersionObj.label}</span>
        <svg
          className={styles.versionIcon}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M6 9L1 4h10z" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.versionMenu}>
          {versions.map((version) => (
            <button
              key={version.name}
              className={`${styles.versionItem} ${version.name === currentVersion ? styles.versionItemActive : ''}`}
              onClick={() => handleVersionChange(version.path)}
            >
              <span>{version.label}</span>
              {version.badge && (
                <span className={styles.versionBadge}>{t.latest}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return createPortal(dropdownContent, portalContainer)
}

export default VersionDropdown
