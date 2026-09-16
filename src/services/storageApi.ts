import type { StorageBrowseResult } from '../types/storage';
import { httpClient } from './httpClient';

export const storageQueryKeys = {
  all: ['storage'] as const,
  browse: (prefix: string) => [...storageQueryKeys.all, 'browse', prefix] as const,
};

export const browseStorage = async (
  prefix: string,
  continuationToken?: string,
  signal?: AbortSignal,
): Promise<StorageBrowseResult> =>
  (
    await httpClient.get<StorageBrowseResult>('/storage/browse', {
      params: continuationToken ? { prefix, continuation_token: continuationToken } : { prefix },
      signal,
    })
  ).data;

/** Presigned GET URL; files are opened/downloaded directly against storage, never through this API. */
export const getStorageDownloadUrl = async (key: string): Promise<string> =>
  (await httpClient.get<{ url: string }>('/storage/download-url', { params: { key } })).data.url;
