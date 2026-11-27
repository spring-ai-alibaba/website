import { useEffect } from 'react'
import {
  useActiveDocContext,
  useActivePluginAndVersion,
  useDocsPreferredVersion,
  useVersions,
} from '@docusaurus/plugin-content-docs/client'
import type { ComponentTypesObject } from '@theme/NavbarItem/ComponentTypes'
import type { Props as SidebarProps } from '@theme/NavbarItem/DocSidebarNavbarItem'
import type { Props as VersionProps } from '@theme/NavbarItem/DocsVersionDropdownNavbarItem'
import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes'
import DefaultNavbarItem from '@theme/NavbarItem/DefaultNavbarItem'
import DocSidebarNavbarItem from '@theme/NavbarItem/DocSidebarNavbarItem'
import DocsVersionDropdownNavbarItem from '@theme/NavbarItem/DocsVersionDropdownNavbarItem'
import useSiteDocsVersion from '../../hooks/useSiteDocsVersion'

function SiteDocsVersionDropdown(props: VersionProps) {
  const active = useActivePluginAndVersion()
  const activeName = active?.activeVersion?.name
  const { preferredVersion, savePreferredVersionName } = useDocsPreferredVersion()

  useEffect(() => {
    if (activeName && activeName !== preferredVersion?.name) {
      savePreferredVersionName(activeName)
    }
  }, [activeName, preferredVersion, savePreferredVersionName])

  return <DocsVersionDropdownNavbarItem {...props} docsPluginId={active?.activePlugin.pluginId} />
}

function SiteDocSidebar({ docsPluginId, sidebarId, label, ...props }: SidebarProps) {
  const versionName = useSiteDocsVersion()
  const { activeDoc } = useActiveDocContext(docsPluginId)
  const versions = useVersions(docsPluginId)
  const link = versions.find(version => version.name === versionName)?.sidebars?.[sidebarId]?.link

  if (!link) {
    return <DocSidebarNavbarItem {...props} docsPluginId={docsPluginId} sidebarId={sidebarId} label={label} />
  }

  return (
    <DefaultNavbarItem
      exact
      {...props}
      isActive={() => activeDoc?.sidebar === sidebarId}
      label={label ?? link.label}
      to={link.path}
    />
  )
}

const componentTypes: ComponentTypesObject = {
  ...ComponentTypes,
  docsVersionDropdown: SiteDocsVersionDropdown,
  docSidebar: SiteDocSidebar,
}

export default componentTypes
