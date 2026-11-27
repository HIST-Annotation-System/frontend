import type { Tag } from '../types/tag';
import type { AccountResponse, Role } from '../types/user';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  ORG_ADMIN: 'Administrator organizacji',
  ANNOTATOR: 'Anotator',
};

/** Roles an organization's admin may give; the system admin may also make system admins. */
export const ORGANIZATION_ROLES: Role[] = ['ANNOTATOR', 'ORG_ADMIN'];
export const ALL_ROLES: Role[] = ['ANNOTATOR', 'ORG_ADMIN', 'ADMIN'];

export const isSystemAdmin = (user: AccountResponse | null | undefined): boolean => user?.role === 'ADMIN';

export const isManager = (user: AccountResponse | null | undefined): boolean =>
  user?.role === 'ADMIN' || user?.role === 'ORG_ADMIN';

/** May upload slides and hotspot images: administrators, and annotators given "Może wgrywać pliki". */
export const canUpload = (user: AccountResponse | null | undefined): boolean =>
  isManager(user) || !!user?.profile?.can_upload;

/**
 * May rename, re-weight or delete `tag`: the system admin any tag, an organization's admin only their organization's
 * (global tags are shared by everyone). The API enforces the same.
 */
export const canChangeTag = (user: AccountResponse | null | undefined, tag: Pick<Tag, 'organization_id'>): boolean =>
  isSystemAdmin(user) ||
  (user?.role === 'ORG_ADMIN' && tag.organization_id !== null && tag.organization_id === user.organization?.id);
