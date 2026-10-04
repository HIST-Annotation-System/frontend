import type { Position } from './geometry';

/** GeoJSON Polygon in level-0 slide pixels (single, closed exterior ring). */
export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

/**
 * What a set of annotations belongs to: a whole slide (level-0 slide pixels) or a hotspot (hotspot image
 * pixels). Both expose the same annotation API under their own path.
 */
export interface AnnotationOwner {
  type: 'slides' | 'hotspots';
  id: string;
}

export interface AnnotationClass {
  id: string;
  name: string;
  color: string;
}

export interface Annotation {
  id: string;
  class_id: string;
  geometry: PolygonGeometry;
  created_at: string;
}

export interface AnnotationCreate {
  id?: string;
  class_id: string;
  geometry: PolygonGeometry;
}

export interface AnnotationUpdate {
  class_id?: string;
  geometry?: PolygonGeometry;
}

/** Annotation as exchanged with the annotator; freshly drawn shapes have no class yet. */
export interface AnnotationDraft {
  id: string;
  class_id: string | null;
  geometry: PolygonGeometry;
}
