import React, { useEffect, useState } from 'react'
import PineconeFloatingSearch from '../components/PineconeFloatingSearch'
import DocNeuralBackground from '../components/DocNeuralBackground'
import BackToTop from '../components/BackToTop'
import VersionDropdown from '../components/VersionDropdown'

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps) {
  const [isDocPage, setIsDocPage] = useState(false)

  useEffect(() => {
    // Check if we're on a documentation page
    const checkPath = () => {
      const path = window.location.pathname
      const isDoc = path.startsWith('/docs') ||
                    path.startsWith('/en/docs') ||
                    path.startsWith('/blog') ||
                    path.startsWith('/en/blog') ||
                    path.startsWith('/community') ||
                    path.startsWith('/en/community')
      setIsDocPage(isDoc)
    }

    checkPath()

    // Listen for route changes
    const handleLocationChange = () => {
      checkPath()
    }

    window.addEventListener('popstate', handleLocationChange)

    // Also check on navigation using MutationObserver
    const observer = new MutationObserver(() => {
      checkPath()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      observer.disconnect()
    }
  }, [])

  // 在 navbar 右侧添加版本选择器
  useEffect(() => {
    const navbar = document.querySelector('.navbar__items--right')
    if (navbar) {
      // 检查是否已添加
      let versionContainer = document.querySelector('.navbar__version-dropdown')
      if (!versionContainer) {
        versionContainer = document.createElement('div')
        versionContainer.className = 'navbar__version-dropdown'
        versionContainer.id = 'version-dropdown-portal'
        // 插入到语言选择器之前
        const localeDropdown = navbar.querySelector('.navbar__item.dropdown')
        if (localeDropdown) {
          navbar.insertBefore(versionContainer, localeDropdown)
        } else {
          navbar.appendChild(versionContainer)
        }
      }
    }
  }, [])

  return (
    <>
      {isDocPage && <DocNeuralBackground />}
      {children}
      <PineconeFloatingSearch />
      <BackToTop />
      <VersionDropdown />
    </>
  )
}
