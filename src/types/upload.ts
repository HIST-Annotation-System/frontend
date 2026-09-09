export interface StartUploadResponse {
  upload_id: string;
  key: string;
}

export interface PresignedUrlsResponse {
  urls: string[];
}

export interface RefreshUrlsResponse {
  urls: Record<number, string>;
}

export interface UploadPart {
  PartNumber: number;
  ETag: string;
}

export interface CompleteUploadResponse {
  success: boolean;
  message: string;
}
