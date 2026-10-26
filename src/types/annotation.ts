import type { Position } from './geometry';

/** GeoJSON Polygon in hotspot image pixels (single, closed exterior ring). */
export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

/** Corner or smooth point with Bézier handles (absolute positions, same pixels as the polygon). */
export interface CurvePoint {
  type: 'corner' | 'curve';
  point: Position;
  in_handle?: Position | null;
  out_handle?: Position | null;
  locked?: boolean;
}

/** Closed Bézier path the polygon was drawn as; the server derives the polygon from it. */
export interface CurveGeometry {
  points: CurvePoint[];
}

/** What a set of annotations belongs to: a hotspot (annotations are in its image pixels). */
export interface AnnotationOwner {
  type: 'hotspots';
  id: string;
}

/** Canvas tool: pan and zoom, draw a polygon or a smooth curve point by point, or draw freehand. */
export type ToolMode = 'navigate' | 'polygon' | 'curve' | 'freehand';

/** A cell outline, or an area left out of model training (blur, fold, dust, slide edge); areas have no class. */
export type AnnotationKind = 'cell' | 'excluded';

export interface AnnotationClass {
  id: string;
  name: string;
  color: string;
}

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  class_id: string | null;
  geometry: PolygonGeometry;
  curve?: CurveGeometry | null;
  created_at: string;
  /** A cell lying wholly inside an excluded area of the same hotspot. */
  inside_excluded?: boolean;
  /**
   * Excluded areas merged into this one on save and deleted (or, when an older area was kept, the id of the area just
   * sent, never stored). Only set on create/update responses.
   */
  absorbed_ids?: string[];
}

export interface AnnotationCreate {
  id?: string;
  kind: AnnotationKind;
  class_id: string | null;
  geometry: PolygonGeometry;
  curve?: CurveGeometry | null;
}

/** Switching to `excluded` clears the class; switching to `cell` needs one. */
export interface AnnotationUpdate {
  kind?: AnnotationKind;
  class_id?: string;
  geometry?: PolygonGeometry;
  curve?: CurveGeometry | null;
}

/** Annotation as exchanged with the annotator; freshly drawn shapes have no class (nor kind) yet. */
export interface AnnotationDraft {
  id: string;
  kind: AnnotationKind;
  class_id: string | null;
  geometry: PolygonGeometry;
  curve: CurveGeometry | null;
}
