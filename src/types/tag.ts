/** An exclusive verdict: a hotspot holds at most one tag of each dimension. */
export type TagDimension = 'importance' | 'accuracy';

/**
 * A label experts put on hotspots, shared by everyone; a hotspot's score is the sum of its tags' weights.
 * Core tags (importance and accuracy values) have a dimension; tags created by experts do not, and stack.
 */
export interface Tag {
  id: number;
  name: string;
  dimension: TagDimension | null;
  weight: number;
}

export interface TagCreate {
  name: string;
  weight: number;
}

export interface TagUpdate {
  name?: string;
  weight?: number;
}

/** Tags to remove from, then add to, every listed hotspot. */
export interface HotspotTagsBulk {
  hotspot_ids: string[];
  add: number[];
  remove: number[];
}
