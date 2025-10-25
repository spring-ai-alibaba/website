import React, { useState, useCallback } from 'react';
import styles from './styles.module.css';

interface ImageZoomProps {
  src: string;
  alt?: string;
  className?: string;
}

const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt = '', className = '' }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleImageClick = useCallback(() => {
    setIsZoomed(true);
  }, []);

  const handleCloseZoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(false);
  }, []);

  const handleZoomClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(true);
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomed(false);
    }
  }, []);

  return (
    <>
      {/* 原始图片容器 */}
      <div className={`${styles.imageContainer} ${className}`}>
        <img
          src={src}
          alt={alt}
          className={styles.image}
          onClick={handleImageClick}
        />
        
        {/* 悬浮时显示的放大按钮 */}
        <div className={styles.zoomButton} onClick={handleZoomClick}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
      </div>

      {/* 放大模态框 */}
      {isZoomed && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modalContent}>
            {/* 关闭按钮 */}
            <button className={styles.closeButton} onClick={handleCloseZoom}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            {/* 放大后的图片 */}
            <img
              src={src}
              alt={alt}
              className={styles.zoomedImage}
            />
            
            {/* 图片描述 */}
            {alt && (
              <div className={styles.imageCaption}>
                {alt}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageZoom;
