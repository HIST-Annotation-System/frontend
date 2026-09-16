export type Role = 'ADMIN' | 'ANNOTATOR';

export interface CategoryResponse {
  id: number;
  name: string;
}

export interface AnnotationGroupResponse {
  id: number;
  name: string;
}

export interface AnnotatorProfileResponse {
  id: number;
  first_name: string;
  last_name: string;
  can_upload: boolean;
  group?: AnnotationGroupResponse | null;
  categories: CategoryResponse[];
}

export interface AccountResponse {
  id: number;
  username: string;
  role: Role;
  is_first_login: boolean;
  profile?: AnnotatorProfileResponse | null;
}

export interface AccountCreate {
  username: string;
  password: string;
  role?: Role;
}

export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  can_upload?: boolean | null;
  group_id?: number | null;
  category_ids?: number[] | null;
  password?: string | null;
}
