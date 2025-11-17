import React from 'react'
import MDXComponents from '@theme-original/MDXComponents'
import CodeBlockWithLink from '@site/src/components/CodeBlockWithLink'

export default {
  ...MDXComponents,
  CodeBlockWithLink,
  // 也可以用简短的别名
  Code: CodeBlockWithLink,
}

