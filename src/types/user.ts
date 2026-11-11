import type { OrganizationRef } from './organization';

/** ADMIN is the system administrator (no organization); ORG_ADMIN administers one organization. */
export type Role = 'ADMIN' | 'ANNOTATOR' | 'ORG_ADMIN';

export interface CategoryResponse {
  id: number;
  name: string;
}

export interface AnnotatorProfileResponse {
  id: number;
  first_name: string;
  last_name: string;
  can_upload: boolean;
  categories: CategoryResponse[];
}

export interface AccountResponse {
  id: number;
  username: string;
  role: Role;
  is_first_login: boolean;
  /** Null for system administrators. */
  organization?: OrganizationRef | null;
  profile?: AnnotatorProfileResponse | null;
}

export interface AccountCreate {
  username: string;
  password: string;
  role?: Role;
  can_upload?: boolean;
  organization_id?: number | null;
}

export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  can_upload?: boolean | null;
  category_ids?: number[] | null;
  password?: string | null;
  role?: Role | null;
  organization_id?: number | null;
}
