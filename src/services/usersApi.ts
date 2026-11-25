import { httpClient } from './httpClient';
import type { AccountCreate, AccountResponse, ProfileUpdate } from '../types/user';

export const usersApi = {
  getMe: async (): Promise<AccountResponse> => {
    const response = await httpClient.get<AccountResponse>('/users/me');
    return response.data;
  },

  getAll: async (): Promise<AccountResponse[]> => {
    const response = await httpClient.get<AccountResponse[]>('/users/');
    return response.data;
  },

  createAccount: async (data: AccountCreate): Promise<AccountResponse> => {
    const response = await httpClient.post<AccountResponse>('/users/', data);
    return response.data;
  },

  updateAccount: async (accountId: number, data: ProfileUpdate): Promise<AccountResponse> => {
    const response = await httpClient.put<AccountResponse>(`/users/${accountId}`, data);
    return response.data;
  },

  deleteAccount: async (accountId: number): Promise<void> => {
    await httpClient.delete(`/users/${accountId}`);
  }
};
