export interface StartUploadResponse {
  slide_id: string;
  upload_id: string;
}

export interface PresignedUrlsResponse {
  urls: string[];
}

export interface RefreshUrlsResponse {
  urls: Record<string, string>;
}

export interface UploadPart {
  PartNumber: number;
  ETag: string;
}

export interface ImportFromStorageResponse {
  slide_id: string;
}
