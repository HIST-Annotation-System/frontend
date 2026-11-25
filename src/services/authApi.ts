import { httpClient } from './httpClient';
import type { LoginRequest, ProfileSetup, TokenResponse } from '../types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await httpClient.post<TokenResponse>('/auth/login', data);
    return response.data;
  },
  
  setupProfile: async (data: ProfileSetup): Promise<TokenResponse> => {
    const response = await httpClient.post<TokenResponse>('/auth/setup-profile', data);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await httpClient.post('/auth/logout');
  }
};
