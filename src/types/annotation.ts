import type { Position } from './geometry';

/** GeoJSON Polygon in hotspot image pixels (single, closed exterior ring). */
export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

/** What a set of annotations belongs to: a hotspot (annotations are in its image pixels). */
export interface AnnotationOwner {
  type: 'hotspots';
  id: string;
}

/** Canvas tool: pan and zoom, or draw polygons. */
export type ToolMode = 'navigate' | 'draw';

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
