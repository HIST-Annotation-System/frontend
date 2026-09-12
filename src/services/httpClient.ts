import axios, { isAxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

type QueryParams = Record<string, string | number>;

export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
    return new ApiError(body ? describeDetail(body.detail) : error.message, error.response?.status ?? null);
  }
  return new ApiError(error instanceof Error ? error.message : 'Unexpected error');
};

export const httpClient = axios.create({ baseURL: API_URL });

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => Promise.reject(await toApiError(error)),
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
