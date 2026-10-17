import { boundsFromPoints, ShapeType } from '@annotorious/react';
import type { Position } from '../../../types/geometry';
import { toPolylinePoint, type Polyline } from '../utils/annotationAdapter';
import { flattenCurve, smoothClosedCurve } from '../utils/curve';

interface ToolInstance {
  $set(props: Record<string, unknown>): void;
  $on(type: string, listener: (event: { detail: unknown }) => void): () => void;
  $destroy(): void;
}

type ToolConstructor = new (options: { target: SVGGElement; props: Record<string, unknown> }) => ToolInstance;

const toSmoothCurve = (shape: Polyline): Polyline => {
  const corners: Position[] = shape.geometry.points.map(({ point }) => [point[0], point[1]]);
  if (corners.length < 3) return shape;
  const curve = smoothClosedCurve(corners);
  return {
    type: ShapeType.POLYLINE,
    geometry: {
      points: curve.map(toPolylinePoint),
      closed: true,
      bounds: boundsFromPoints(flattenCurve(curve)),
    },
  };
};

/** Curve tool: the plugin's path tool whose finished path becomes a smooth Bézier curve through its points. */
export const createSmoothPathTool = (PathTool: ToolConstructor): ToolConstructor =>
  class SmoothPathTool implements ToolInstance {
    private readonly tool: ToolInstance;

    constructor(options: { target: SVGGElement; props: Record<string, unknown> }) {
      this.tool = new PathTool(options);
    }

    $set(props: Record<string, unknown>): void {
      this.tool.$set(props);
    }

    $on(type: string, listener: (event: { detail: unknown }) => void): () => void {
      if (type !== 'create') return this.tool.$on(type, listener);
      return this.tool.$on(type, (event) => listener({ detail: toSmoothCurve(event.detail as Polyline) }));
    }

    $destroy(): void {
      this.tool.$destroy();
    }
  };
