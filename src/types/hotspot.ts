import type { Tag } from './tag';

export interface HotspotFolder {
  id: string;
  name: string;
  /** Hotspots belong to the organization of their folder. */
  organization_id: number;
  hotspot_count: number;
  created_at: string;
}

export type HotspotImageType = 'png' | 'jpeg';

/** Image descriptors computed on a hotspot's thumbnail; the catalog can be sorted by any of them. */
export type HotspotFeature = 'entropy' | 'glcm_contrast' | 'edge_density' | 'colorfulness';

/** Creation time, an image feature, the score, the average importance/accuracy rating, or how many rated it. */
export type HotspotSort = 'created_at' | HotspotFeature | 'score' | 'importance' | 'accuracy' | 'rating_count';

/** Where a hotspot is in the review; tagged means its ratings set both importance and accuracy. */
export type HotspotStatus = 'untagged' | 'to_reannotate' | 'reannotated';

export type SortOrder = 'asc' | 'desc';

/** The model's run on a hotspot; `skipped`: someone started annotating by hand first. */
export type SegmentationStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface HotspotRating {
  account_id: number;
  username: string;
  full_name: string | null;
  importance: Tag | null;
  accuracy: Tag | null;
  updated_at: string;
}

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
  /**
   * The team's verdict (the core tag nearest to the average rating of each dimension) first, then the custom tags
   * by name. The verdict is left out for an annotator who has not rated the hotspot yet.
   */
  tags: Tag[];
  /** Custom tag weights plus the rounded average ratings (the custom tags only, while the verdict is hidden). */
  score: number;
  /** When an annotator marked it as reannotated; cleared when the team's verdict changes. */
  reannotated_at: string | null;
  /** Who changed a rating last (hidden with the verdict). */
  assessed_by: string | null;
  status: HotspotStatus;
  rating_count: number;
  my_rating: HotspotRating | null;
  /** Everyone's ratings (the team); null while the user may not see them (an annotator who has not rated it). */
  ratings: HotspotRating[] | null;
  /** Cells annotated by people; untouched model cells don't count. */
  annotation_count: number;
  segmentation_status: SegmentationStatus;
  segmentation_error: string | null;
  created_at: string;
}

/** Which hotspots the catalog lists, and in what order. */
export interface HotspotListQuery {
  /** null: every folder. */
  folderId: string | null;
  sort: HotspotSort;
  order: SortOrder;
  /** null: any status. */
  status: HotspotStatus | null;
  /** Hotspots must carry all of them. */
  tagIds: number[];
  /** null: any number of ratings. */
  ratingCount?: number | null;
  /** false: only those the user has not rated (both parts) yet; null/undefined: all. */
  ratedByMe?: boolean | null;
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
  reannotated?: boolean;
}

/** Slide squares whose image stats to compute before they are cut out. */
export interface BoxFeaturesRequest {
  slide_id: string;
  /** Level-0 [x, y] top-left corner of each box. */
  boxes: [number, number][];
}

/** The stats a hotspot cut from this square would get (read at thumbnail size, so they may differ by a hair). */
export interface BoxFeatures {
  x: number;
  y: number;
  features: Partial<Record<HotspotFeature, number>>;
}
