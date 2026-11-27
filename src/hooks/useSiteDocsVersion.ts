import {
  useActivePluginAndVersion,
  useDocsPreferredVersion,
} from '@docusaurus/plugin-content-docs/client'

export default function useSiteDocsVersion() {
  const active = useActivePluginAndVersion()
  const { preferredVersion } = useDocsPreferredVersion()
  return active?.activeVersion?.name ?? preferredVersion?.name ?? 'current'
}
