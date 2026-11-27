/** An exclusive verdict: a hotspot holds at most one tag of each dimension. */
export type TagDimension = 'importance' | 'accuracy';

/**
 * A label experts put on hotspots; a hotspot's score is the sum of its tags' weights.
 * Core tags (importance and accuracy values) have a dimension; tags created by experts do not, and stack.
 * Global tags (the core ones and those the system admin creates) are seen by everyone; any other tag belongs to the
 * organization of whoever created it.
 */
export interface Tag {
  id: number;
  name: string;
  dimension: TagDimension | null;
  weight: number;
  /** Null for a global tag. */
  organization_id: number | null;
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
