import React, { type ReactNode } from 'react'
import TOCOriginal from '@theme-original/TOC'
import type TOCType from '@theme/TOC'
import type { WrapperProps } from '@docusaurus/types'

type Props = WrapperProps<typeof TOCType>

export default function TOCWrapper(props: Props): ReactNode {
  return <TOCOriginal {...props} />
}
