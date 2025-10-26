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

  // 加载图片放大功能的 JavaScript
  useEffect(() => {
    // 图片放大功能
    function initImageZoom() {
      // 查找博客文章容器
      const blogArticle = document.querySelector('article')
      if (!blogArticle) return

      // 查找所有博客文章中的图片
      const images = blogArticle.querySelectorAll('img')
      
      images.forEach((img) => {
        // 跳过已经处理过的图片
        if (img.closest('.image-zoom-wrapper')) return
        
        const src = img.getAttribute('src')
        const alt = img.getAttribute('alt') || ''
        const className = img.getAttribute('class') || ''
        
        if (src) {
          // 创建包装器
          const wrapper = document.createElement('div')
          wrapper.className = 'image-zoom-wrapper'
          
          // 复制原始图片的所有属性
          const newImg = document.createElement('img')
          newImg.src = src
          newImg.alt = alt
          newImg.className = className
          
          // 复制所有其他属性
          for (let i = 0; i < img.attributes.length; i++) {
            const attr = img.attributes[i]
            if (attr.name !== 'src' && attr.name !== 'alt' && attr.name !== 'class') {
              newImg.setAttribute(attr.name, attr.value)
            }
          }
          
          // 添加点击事件来模拟放大功能
          newImg.style.cursor = 'pointer'
          newImg.addEventListener('click', () => {
            openImageZoom(src, alt)
          })
          
          wrapper.appendChild(newImg)
          
          // 添加悬浮放大按钮
          const zoomButton = document.createElement('div')
          zoomButton.className = 'image-zoom-button'
          zoomButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          `
          
          zoomButton.addEventListener('click', (e) => {
            e.stopPropagation()
            openImageZoom(src, alt)
          })
          
          wrapper.appendChild(zoomButton)
          
          // 插入到原始图片位置
          img.parentNode?.insertBefore(wrapper, img)
          img.remove()
        }
      })
    }

    // 打开图片放大模态框
    function openImageZoom(src: string, alt: string) {
      // 创建模态框
      const modal = document.createElement('div')
      modal.className = 'image-zoom-modal'
      
      const modalContent = document.createElement('div')
      modalContent.className = 'image-zoom-modal-content'
      
      const closeButton = document.createElement('button')
      closeButton.className = 'image-zoom-close'
      closeButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `
      
      const zoomedImg = document.createElement('img')
      zoomedImg.className = 'image-zoom-zoomed'
      zoomedImg.src = src
      zoomedImg.alt = alt
      
      const caption = alt ? document.createElement('div') : null
      if (caption) {
        caption.className = 'image-zoom-caption'
        caption.textContent = alt
      }
      
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal)
        document.body.classList.remove('modal-open')
      })
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal)
          document.body.classList.remove('modal-open')
        }
      })
      
      // 添加键盘事件支持
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal)
          document.body.classList.remove('modal-open')
          document.removeEventListener('keydown', handleKeyDown)
        }
      }
      
      document.addEventListener('keydown', handleKeyDown)
      
      modalContent.appendChild(closeButton)
      modalContent.appendChild(zoomedImg)
      if (caption) modalContent.appendChild(caption)
      modal.appendChild(modalContent)
      
      document.body.appendChild(modal)
      document.body.classList.add('modal-open')
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initImageZoom)
    } else {
      initImageZoom()
    }

    // 监听路由变化（适用于 SPA）
    let currentPath = window.location.pathname
    
    const observeUrlChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        currentPath = newPath
        // 延迟执行以确保新内容已加载
        setTimeout(initImageZoom, 100)
      }
    }
    
    // 使用 MutationObserver 监听路由变化
    const observer = new MutationObserver(() => {
      observeUrlChange()
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
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
