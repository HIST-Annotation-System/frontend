export interface StartUploadRequest {
  filename: string;
  /** Lets the backend reject a second upload of the same file (409 `duplicate_slide`) before any byte is sent. */
  file_size: number;
  /** Set after the user confirmed they want another copy anyway. */
  allow_duplicate: boolean;
}

export interface StartUploadResponse {
  slide_id: string;
  upload_id: string;
}

export interface RefreshUrlsResponse {
  urls: Record<string, string>;
}

export interface UploadPart {
  PartNumber: number;
  ETag: string;
}

export interface UploadedPart extends UploadPart {
  Size: number;
}

export interface UploadedPartsResponse {
  parts: UploadedPart[];
}
