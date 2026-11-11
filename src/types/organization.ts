export interface OrganizationRef {
  id: number;
  name: string;
}

export interface Organization extends OrganizationRef {
  created_at: string;
  member_count: number;
}
