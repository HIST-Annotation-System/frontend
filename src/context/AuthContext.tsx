import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/usersApi';
import { authApi } from '../services/authApi';
import type { AccountResponse } from '../types/user';
import type { LoginRequest, ProfileSetup } from '../types/auth';
import { ApiError } from '../services/httpClient';

interface AuthContextType {
  user: AccountResponse | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  setupProfile: (data: ProfileSetup) => Promise<void>;
  /** Reloads the current user, e.g. after their profile changed. */
  refetch: () => Promise<unknown>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await usersApi.getMe();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null; // Not logged in
        }
        throw err;
      }
    },
    retry: false, // Don't retry on 401
    staleTime: Infinity, // Keep user data fresh until explicitly invalidated
  });

  const login = async (data: LoginRequest) => {
    try {
      setError(null);
      await authApi.login(data);
      await refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
      throw err;
    }
  };

  const setupProfile = async (data: ProfileSetup) => {
    try {
      setError(null);
      await authApi.setupProfile(data);
      await refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      queryClient.setQueryData(['auth', 'me'], null);
    }
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, setupProfile, refetch, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
