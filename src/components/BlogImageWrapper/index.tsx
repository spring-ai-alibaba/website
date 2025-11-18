import React, { useRef } from 'react'

interface BlogImageWrapperProps {
  children?: React.ReactNode;
}

const BlogImageWrapper: React.FC<BlogImageWrapperProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  return <div ref={containerRef}>{children}</div>
}

export default BlogImageWrapper
