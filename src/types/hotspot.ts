export interface HotspotFolder {
  id: string;
  name: string;
  hotspot_count: number;
  created_at: string;
}

export type HotspotImageType = 'png' | 'jpeg';

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
  created_at: string;
}

export interface HotspotCreate {
  slide_id: string;
  folder_id: string;
  name: string;
  x: number;
  y: number;
  size: number;
}

export interface HotspotUpdate {
  name?: string;
  folder_id?: string;
}
