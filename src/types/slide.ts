import type { Offset, Rect } from './geometry';

export type SlideStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface Slide {
  id: string;
  name: string;
  original_filename: string;
  status: SlideStatus;
  error_message: string | null;
  vendor: string | null;
  width: number | null;
  height: number | null;
  level_count: number | null;
  mpp_x: number | null;
  objective_power: number | null;
  file_size_bytes: number | null;
  /** Deep Zoom image coordinates + offset = level-0 slide coordinates. */
  image_offset: Offset;
  /** Bounding box of the detected tissue, in level-0 pixels. */
  tissue_bbox: Rect | null;
  created_at: string;
}

export interface SlideDetail extends Slide {
  properties: Record<string, string>;
}
