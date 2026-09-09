import axios from 'axios';
import type {
  StartUploadResponse,
  PresignedUrlsResponse,
  RefreshUrlsResponse,
  UploadPart,
  CompleteUploadResponse
} from '../types/upload';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const startMultipartUpload = async (filename: string): Promise<StartUploadResponse> => {
  const response = await axios.post(`${API_URL}/upload/start`, { filename });
  return response.data;
};

export const getPresignedUrls = async (
  uploadId: string,
  key: string,
  totalParts: number
): Promise<PresignedUrlsResponse> => {
  const response = await axios.post(`${API_URL}/upload/presigned-urls`, {
    upload_id: uploadId,
    key,
    total_parts: totalParts,
  });
  return response.data;
};

export const refreshPresignedUrls = async (
  uploadId: string,
  key: string,
  pendingParts: number[]
): Promise<RefreshUrlsResponse> => {
  const response = await axios.post(`${API_URL}/upload/refresh-urls`, {
    upload_id: uploadId,
    key,
    pending_parts: pendingParts,
  });
  return response.data;
};

export const completeMultipartUpload = async (
  uploadId: string,
  key: string,
  parts: UploadPart[]
): Promise<CompleteUploadResponse> => {
  const response = await axios.post(`${API_URL}/upload/complete`, {
    upload_id: uploadId,
    key,
    parts,
  });
  return response.data;
};

export const uploadChunkToS3 = (url: string, chunk: Blob, onUploadProgress?: (progressEvent: any) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    if (onUploadProgress) {
      xhr.upload.onprogress = onUploadProgress;
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
        if (!etag) {
          reject(new Error("ETag missing in response headers. Ensure MinIO exposes it."));
        } else {
          resolve(etag.replace(/"/g, ''));
        }
      } else {
        const err: any = new Error(`Upload failed with status ${xhr.status}`);
        err.response = { status: xhr.status, data: xhr.responseText };
        reject(err);
      }
    };

    xhr.onerror = () => {
      const err: any = new Error("Network Error");
      err.response = { status: 0 };
      reject(err);
    };

    xhr.send(chunk);
  });
};
