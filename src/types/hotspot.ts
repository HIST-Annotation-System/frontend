export interface HotspotFolder {
  id: string;
  name: string;
  hotspot_count: number;
  created_at: string;
}

export type HotspotImageType = 'png' | 'jpeg';

/** Image descriptors computed on a hotspot's thumbnail; the catalog can be sorted by any of them. */
export type HotspotFeature = 'entropy' | 'glcm_contrast' | 'edge_density' | 'colorfulness';

export type HotspotSort = 'created_at' | HotspotFeature;

export type SortOrder = 'asc' | 'desc';

/**
 * An image to annotate: a square captured from a slide (it outlives the slide), or an uploaded PNG/JPEG
 * (all slide fields null).
 */
export interface Hotspot {
  id: string;
  folder_id: string;
  name: string;
  /** null once the source slide has been deleted (`slide_name` is kept), or for an uploaded image. */
  slide_id: string | null;
  /** null for an uploaded image. */
  slide_name: string | null;
  /** The captured square, in level-0 slide pixels; null for an uploaded image. */
  x: number | null;
  y: number | null;
  size: number | null;
  /** The stored image in pixels (large images are scaled down). */
  image_width: number;
  image_height: number;
  image_type: HotspotImageType;
  /** Microns per pixel of the stored image, when the slide reports it. */
  mpp: number | null;
  /** Feature values; null (or a key missing) when they could not be computed. */
  features: Partial<Record<HotspotFeature, number>> | null;
  created_at: string;
}

/** Fixed-size slide squares to cut out into hotspots, each named `{name_prefix} ({x}, {y})`. */
export interface HotspotBatchCreate {
  /** Chosen by the client, so a retried request does not start the batch twice. */
  id: string;
  slide_id: string;
  folder_id: string;
  name_prefix: string;
  /** Level-0 [x, y] top-left corner of each box to cut out. */
  boxes: [number, number][];
}

export type HotspotBatchStatus = 'running' | 'done' | 'failed';

/** Hotspots being cut out of a slide in the background. */
export interface HotspotBatch {
  id: string;
  slide_id: string;
  slide_name: string;
  folder_id: string;
  folder_name: string;
  total: number;
  done: number;
  status: HotspotBatchStatus;
  error_message: string | null;
  created_at: string;
}

export interface HotspotUpdate {
  name?: string;
  folder_id?: string;
}
