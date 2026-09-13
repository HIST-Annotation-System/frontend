import type {
  ImportFromStorageResponse,
  PresignedUrlsResponse,
  RefreshUrlsResponse,
  StartUploadResponse,
  UploadPart,
} from '../types/upload';
import { ApiError, httpClient } from './httpClient';

export const startMultipartUpload = async (filename: string): Promise<StartUploadResponse> =>
  (await httpClient.post<StartUploadResponse>('/upload/start', { filename })).data;

export const getPresignedUrls = async (
  slideId: string,
  uploadId: string,
  totalParts: number,
): Promise<PresignedUrlsResponse> =>
  (
    await httpClient.post<PresignedUrlsResponse>('/upload/presigned-urls', {
      slide_id: slideId,
      upload_id: uploadId,
      total_parts: totalParts,
    })
  ).data;

export const refreshPresignedUrls = async (
  slideId: string,
  uploadId: string,
  pendingParts: number[],
): Promise<RefreshUrlsResponse> =>
  (
    await httpClient.post<RefreshUrlsResponse>('/upload/refresh-urls', {
      slide_id: slideId,
      upload_id: uploadId,
      pending_parts: pendingParts,
    })
  ).data;

export const completeMultipartUpload = async (
  slideId: string,
  uploadId: string,
  parts: UploadPart[],
): Promise<void> => {
  await httpClient.post('/upload/complete', { slide_id: slideId, upload_id: uploadId, parts });
};

/** Registers a file already sitting in object storage as a new slide, skipping the upload step. */
export const importFromStorage = async (key: string): Promise<ImportFromStorageResponse> =>
  (await httpClient.post<ImportFromStorageResponse>('/upload/import-from-storage', { key })).data;

/** PUTs one part straight to object storage and resolves with its ETag. */
export const uploadChunkToStorage = (
  url: string,
  chunk: Blob,
  onProgress?: (loadedBytes: number) => void,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    if (onProgress) {
      xhr.upload.onprogress = (event) => onProgress(event.loaded);
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag') ?? xhr.getResponseHeader('etag');
        if (etag) {
          resolve(etag.replace(/"/g, ''));
        } else {
          reject(new ApiError('ETag missing in response headers. Ensure MinIO exposes it.', xhr.status));
        }
      } else {
        reject(new ApiError(`Upload failed with status ${xhr.status}`, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError('Network Error', 0));

    xhr.send(chunk);
  });
