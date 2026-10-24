import type {
  RefreshUrlsResponse,
  StartUploadRequest,
  StartUploadResponse,
  UploadedPartsResponse,
  UploadPart,
} from '../types/upload';
import { UploadCancelledError } from '../utils/errors';
import { ApiError, httpClient } from './httpClient';

export const startMultipartUpload = async (file: File, allowDuplicate = false): Promise<StartUploadResponse> => {
  const request: StartUploadRequest = { filename: file.name, file_size: file.size, allow_duplicate: allowDuplicate };
  return (await httpClient.post<StartUploadResponse>('/upload/start', request)).data;
};

/** Shares this browser's upload progress, so other tabs and admins see it on the slide card. */
export const reportUploadProgress = async (slideId: string, percent: number): Promise<void> => {
  await httpClient.post(`/upload/${slideId}/progress`, { percent });
};

/** Presigned PUT URLs for the given parts. Used for every batch, not only expired ones: URLs are
 * fetched just ahead of the parts that need them, so a long upload never starts on stale URLs. */
export const presignParts = async (
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

/** Parts already in storage, to resume an interrupted upload (fails once the upload was aborted). */
export const listUploadedParts = async (slideId: string, uploadId: string): Promise<UploadedPartsResponse> =>
  (await httpClient.get<UploadedPartsResponse>(`/upload/${slideId}/parts`, { params: { upload_id: uploadId } })).data;

export const completeMultipartUpload = async (
  slideId: string,
  uploadId: string,
  parts: UploadPart[],
): Promise<void> => {
  await httpClient.post('/upload/complete', { slide_id: slideId, upload_id: uploadId, parts });
};

/** Aborts the multipart upload in storage and deletes the slide record created for it. */
export const cancelUpload = async (slideId: string): Promise<void> => {
  await httpClient.post(`/upload/${slideId}/cancel`);
};

/** PUTs one part straight to object storage and resolves with its ETag.
 *
 * Aborting `signal` rejects with `UploadCancelledError` instead of a real `ApiError`, so callers
 * can tell a user-requested cancellation apart from a network/server failure.
 */
export const uploadChunkToStorage = (
  url: string,
  chunk: Blob,
  onProgress?: (loadedBytes: number) => void,
  signal?: AbortSignal,
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadCancelledError());
      return;
    }

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
          reject(new ApiError('ETag missing in response headers. Ensure the bucket CORS exposes it.', xhr.status));
        }
      } else {
        reject(new ApiError(`Upload failed with status ${xhr.status}`, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError('Network Error', 0));
    xhr.onabort = () => reject(new UploadCancelledError());

    signal?.addEventListener('abort', () => xhr.abort());

    xhr.send(chunk);
  });
