import type { Props } from '@theme/Footer/LinkItem'
import LinkItem from '@theme-original/Footer/LinkItem'
import useSiteDocsVersion from '../../../hooks/useSiteDocsVersion'

export default function VersionedFooterLink({ item }: Props) {
  const version = useSiteDocsVersion()
  const to = version === 'current'
    ? item.to
    : item.to?.replace(/^\/(docs|agents|integration|ecosystem)\//, `/$1/${version}/`)
  return <LinkItem item={{ ...item, to }} />
}
