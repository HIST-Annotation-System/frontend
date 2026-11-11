import type { OrganizationRef } from './organization';
import type { Role } from './user';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type: string;
  is_first_login: boolean;
  role?: Role;
  organization?: OrganizationRef | null;
}

export interface ProfileSetup {
  new_password: string;
  first_name: string;
  last_name: string;
  category_ids?: number[];
}
