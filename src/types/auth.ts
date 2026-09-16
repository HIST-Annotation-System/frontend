export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type: string;
  is_first_login: boolean;
}

export interface ProfileSetup {
  new_password: string;
  first_name: string;
  last_name: string;
  group_id?: number | null;
  category_ids?: number[];
}
