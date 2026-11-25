import { httpClient } from './httpClient';
import type { Organization } from '../types/organization';

export const organizationQueryKeys = {
  all: ['organizations'] as const,
};

export const organizationsApi = {
  list: async (signal?: AbortSignal): Promise<Organization[]> =>
    (await httpClient.get<Organization[]>('/organizations/', { signal })).data,

  create: async (name: string): Promise<Organization> =>
    (await httpClient.post<Organization>('/organizations/', { name })).data,

  rename: async (id: number, name: string): Promise<Organization> =>
    (await httpClient.patch<Organization>(`/organizations/${id}`, { name })).data,

  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`/organizations/${id}`);
  },
};
