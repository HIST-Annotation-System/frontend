import axios, { isAxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

type QueryParams = Record<string, string | number>;

export class ApiError extends Error {
  readonly status: number | null;
  /** Backend error code (`{ detail, code }`), when the API sends one. */
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' && value !== null && 'detail' in value;

const readErrorBody = async (data: unknown): Promise<ApiErrorBody | null> => {
  if (data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await data.text());
      return isApiErrorBody(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isApiErrorBody(data) ? data : null;
};

const describeDetail = (detail: ApiErrorBody['detail']): string =>
  typeof detail === 'string' ? detail : detail.map((issue) => issue.msg).join('; ');

const toApiError = async (error: unknown): Promise<ApiError> => {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const body = await readErrorBody(error.response?.data);
    return new ApiError(
      body ? describeDetail(body.detail) : error.message,
      error.response?.status ?? null,
      body?.code ?? null,
    );
  }
  return new ApiError(error instanceof Error ? error.message : 'Unexpected error');
};

export const httpClient = axios.create({ baseURL: API_URL, withCredentials: true });

// Prevent infinite loops if /refresh itself fails
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const originalRequest = isAxiosError(error) ? error.config : null;
    
    // Check if it's a 401, we have an original request, and we haven't already retried this request
    if (
      isAxiosError(error) && 
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest.url?.includes('/auth/login') && 
      !originalRequest.url?.includes('/auth/refresh') && 
      !(originalRequest as any)._retry
    ) {
      if (isRefreshing) {
        try {
          // Wait for the refresh token call to finish before retrying
          await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          return await httpClient(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      try {
        // Assume we have a refresh_token cookie, ask backend to rotate it
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        isRefreshing = false;
        processQueue(null);
        return await httpClient(originalRequest);
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        // If refresh fails, we should probably redirect to login or clear state.
        // For now, just reject. The AuthContext will handle it.
        return Promise.reject(await toApiError(err));
      }
    }
    
    return Promise.reject(await toApiError(error));
  },
);

/** Absolute URL of an API resource that the browser loads directly (tiles, images). */
export const apiUrl = (path: string, params?: QueryParams): string => {
  const query = params
    ? `?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`
    : '';
  return `${API_URL}${path}${query}`;
};

export const fetchBlob = async (path: string, params?: QueryParams): Promise<Blob> =>
  (await httpClient.get<Blob>(path, { params, responseType: 'blob' })).data;
