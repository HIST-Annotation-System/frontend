/** An [x, y] pair (GeoJSON position order). */
export type Position = [number, number];

export interface Offset {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Offset, Size {}
