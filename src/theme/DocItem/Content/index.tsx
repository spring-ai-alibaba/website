import { useDocsVersion } from '@docusaurus/plugin-content-docs/client'
import type { Props } from '@theme/DocItem/Content'
import Content from '@theme-original/DocItem/Content'

export default function VersionedDocContent(props: Props) {
  const { label } = useDocsVersion()

  return (
    <>
      <span hidden data-pagefind-filter={`Version:${label}`} />
      <Content {...props} />
    </>
  )
}
