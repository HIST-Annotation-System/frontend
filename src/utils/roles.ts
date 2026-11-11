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
