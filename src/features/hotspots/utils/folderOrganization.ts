import type { HotspotFolder } from '../../../types/hotspot';

/** The folders a hotspot in `folderId` can move to: those of the same organization (the system admin lists all). */
export const sameOrganizationFolders = (folders: HotspotFolder[], folderId: string): HotspotFolder[] => {
  const organizationId = folders.find((folder) => folder.id === folderId)?.organization_id;
  return organizationId === undefined ? folders : folders.filter((folder) => folder.organization_id === organizationId);
};
