import React, { useEffect, useRef } from 'react'

interface BlogImageWrapperProps {
  children?: React.ReactNode;
}

const BlogImageWrapper: React.FC<BlogImageWrapperProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 查找博客文章容器
    const blogArticle = containerRef.current.closest('article')
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
          // 创建模态框
          const modal = document.createElement('div')
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 2rem;
          `
          
          const modalContent = document.createElement('div')
          modalContent.style.cssText = `
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
          `
          
          const closeButton = document.createElement('button')
          closeButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `
          closeButton.style.cssText = `
            position: absolute;
            top: -50px;
            right: 0;
            width: 44px;
            height: 44px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            color: #374151;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
          `
          
          const zoomedImg = document.createElement('img')
          zoomedImg.src = src
          zoomedImg.alt = alt
          zoomedImg.style.cssText = `
            max-width: 100%;
            max-height: calc(90vh - 100px);
            object-fit: contain;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          `
          
          const caption = alt ? document.createElement('div') : null
          if (caption) {
            caption.textContent = alt
            caption.style.cssText = `
              margin-top: 1rem;
              padding: 0.75rem 1rem;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(10px);
              border-radius: 8px;
              color: #374151;
              font-size: 0.9rem;
              text-align: center;
              max-width: 80%;
              line-height: 1.4;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            `
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
          
          modalContent.appendChild(closeButton)
          modalContent.appendChild(zoomedImg)
          if (caption) modalContent.appendChild(caption)
          modal.appendChild(modalContent)
          
          document.body.appendChild(modal)
          document.body.classList.add('modal-open')
        })
        
        wrapper.appendChild(newImg)
        
        // 添加悬浮放大按钮
        const zoomButton = document.createElement('div')
        zoomButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        `
        zoomButton.style.cssText = `
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #374151;
        `
        
        zoomButton.addEventListener('click', () => {
          newImg.click()
        })
        
        wrapper.appendChild(zoomButton)
        
        // 添加悬浮效果
        wrapper.style.cssText = `
          position: relative;
          display: inline-block;
          cursor: pointer;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          max-width: 100%;
        `
        
        wrapper.addEventListener('mouseenter', () => {
          wrapper.style.transform = 'translateY(-2px)'
          wrapper.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
          newImg.style.filter = 'brightness(0.95)'
          zoomButton.style.opacity = '1'
          zoomButton.style.transform = 'translateY(0)'
        })
        
        wrapper.addEventListener('mouseleave', () => {
          wrapper.style.transform = ''
          wrapper.style.boxShadow = ''
          newImg.style.filter = ''
          zoomButton.style.opacity = '0'
          zoomButton.style.transform = 'translateY(-10px)'
        })
        
        // 插入到原始图片位置
        img.parentNode?.insertBefore(wrapper, img)
        img.remove()
      }
    })
  }, [])

  return <div ref={containerRef}>{children}</div>
}

export default BlogImageWrapper
