import { boundsFromPoints, ShapeType } from '@annotorious/react';
import OpenSeadragon from 'openseadragon';
import type { Position } from '../../../types/geometry';
import { toPolylinePoint, type Polyline } from '../utils/annotationAdapter';
import { flattenCurve, smoothClosedCurve } from '../utils/curve';
import { isFarEnough, strokeToOutline } from '../utils/freehand';

/** Props Annotorious passes to a drawing tool, plus the options it was registered with. */
interface FreehandToolProps {
  addEventListener: (type: string, handler: (event: Event) => void, capture?: boolean) => void;
  transform: { elementToImage: (offsetX: number, offsetY: number) => [number, number] };
  viewportScale: number;
  svgEl?: SVGSVGElement;
  opts?: { viewer?: OpenSeadragon.Viewer };
}

type CreateListener = (event: { detail: Polyline }) => void;

type ViewerSettings = Pick<OpenSeadragon.Options, 'zoomPerScroll' | 'minScrollDeltaTime' | 'constrainDuringPan'>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const PRIMARY_BUTTON = 0;
const SECONDARY_BUTTON = 2;
const ZOOM_PER_SCROLL = 1.2;
const MIN_SCROLL_DELTA_TIME_MS = 50;

const createPath = (style: string): SVGPathElement => {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('style', style);
  return path;
};

/**
 * Freehand drawing tool: press, draw the outline, release to close it as a smooth curve.
 * Implements the part of Annotorious' Svelte tool contract it uses (`$set`, `$on`, `$destroy`). Registered with
 * drawingMode 'drag', which turns OpenSeadragon's mouse navigation off, so it zooms (wheel) and pans (right drag) itself.
 */
export class FreehandTool {
  private readonly props: FreehandToolProps;
  private readonly svg: SVGSVGElement | null;
  private readonly preview: SVGGElement;
  private readonly outline: SVGPathElement[];
  private readonly listeners = new Set<CreateListener>();
  private readonly previousCursor: string;
  private stroke: Position[] = [];
  private pathData = '';
  private drawingPointer: number | null = null;
  private panFrom: { x: number; y: number; pointerId: number } | null = null;
  private lastWheelZoom = 0;

  constructor({ target, props }: { target: SVGGElement; props: FreehandToolProps }) {
    this.props = { ...props };
    this.svg = props.svgEl ?? target.closest('svg');
    this.preview = document.createElementNS(SVG_NS, 'g');
    this.preview.setAttribute('class', 'a9s-annotation a9s-rubberband');
    this.preview.setAttribute('pointer-events', 'none');
    this.outline = [
      createPath('fill: none; stroke: rgba(0, 0, 0, 0.35); stroke-width: 6px; vector-effect: non-scaling-stroke;'),
      createPath(
        'fill: rgba(255, 255, 255, 0.15); stroke: #fff; stroke-width: 2px; vector-effect: non-scaling-stroke;',
      ),
    ];
    this.preview.append(...this.outline);
    target.appendChild(this.preview);

    this.previousCursor = this.svg?.style.cursor ?? '';
    if (this.svg) this.svg.style.cursor = 'crosshair';

    props.addEventListener('pointerdown', this.onPointerDown, true);
    props.addEventListener('pointermove', this.onPointerMove);
    props.addEventListener('pointerup', this.onPointerUp, true);
    props.addEventListener('pointercancel', this.onPointerCancel);
    props.addEventListener('wheel', this.onWheel);
    props.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
  }

  $set(changes: Partial<FreehandToolProps>): void {
    Object.assign(this.props, changes);
  }

  $on(type: string, listener: CreateListener): () => void {
    if (type !== 'create') return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  $destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.reset();
    this.endPan();
    this.preview.remove();
    if (this.svg) this.svg.style.cursor = this.previousCursor;
    this.listeners.clear();
  }

  private get viewer(): OpenSeadragon.Viewer | undefined {
    return this.props.opts?.viewer;
  }

  private get viewerSettings(): ViewerSettings {
    return (this.viewer ?? {}) as ViewerSettings;
  }

  /** Pointer position relative to the viewer element. */
  private toElement(event: MouseEvent): OpenSeadragon.Point {
    const frame = this.viewer?.element ?? this.svg;
    if (!frame) return new OpenSeadragon.Point(event.offsetX, event.offsetY);
    const rect = frame.getBoundingClientRect();
    return new OpenSeadragon.Point(event.clientX - rect.left, event.clientY - rect.top);
  }

  private toImage(event: MouseEvent): Position {
    const { x, y } = this.toElement(event);
    return this.props.transform.elementToImage(x, y);
  }

  private capture(pointerId: number): void {
    try {
      this.svg?.setPointerCapture(pointerId);
    } catch {
      // The pointer is already gone.
    }
  }

  private release(pointerId: number): void {
    if (this.svg?.hasPointerCapture(pointerId)) this.svg.releasePointerCapture(pointerId);
  }

  private render(): void {
    const d = this.pathData ? `${this.pathData} Z` : '';
    this.outline.forEach((path) => path.setAttribute('d', d));
  }

  private addPoint([x, y]: Position): void {
    this.stroke.push([x, y]);
    this.pathData += this.pathData ? ` L ${x} ${y}` : `M ${x} ${y}`;
  }

  private reset(): void {
    if (this.drawingPointer !== null) this.release(this.drawingPointer);
    this.drawingPointer = null;
    this.stroke = [];
    this.pathData = '';
    this.render();
  }

  private endPan(): void {
    if (!this.panFrom) return;
    this.release(this.panFrom.pointerId);
    this.panFrom = null;
    this.viewer?.viewport.applyConstraints();
  }

  private finish(): void {
    const outline = strokeToOutline(this.stroke, this.props.viewportScale);
    this.reset();
    if (!outline) return;
    const curve = smoothClosedCurve(outline);
    const shape: Polyline = {
      type: ShapeType.POLYLINE,
      geometry: {
        points: curve.map(toPolylinePoint),
        closed: true,
        bounds: boundsFromPoints(flattenCurve(curve)),
      },
    };
    // Last step: Annotorious may destroy the tool while handling it.
    [...this.listeners].forEach((listener) => listener({ detail: shape }));
  }

  private readonly onPointerDown = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.button === SECONDARY_BUTTON && this.viewer && this.drawingPointer === null) {
      pointer.preventDefault();
      this.panFrom = { x: pointer.clientX, y: pointer.clientY, pointerId: pointer.pointerId };
      this.capture(pointer.pointerId);
      return;
    }
    if (pointer.button !== PRIMARY_BUTTON || !pointer.isPrimary || this.drawingPointer !== null || this.panFrom) {
      return;
    }
    pointer.preventDefault();
    this.drawingPointer = pointer.pointerId;
    this.capture(pointer.pointerId);
    this.addPoint(this.toImage(pointer));
    this.render();
  };

  private readonly onPointerMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    const viewer = this.viewer;
    if (this.panFrom && viewer && pointer.pointerId === this.panFrom.pointerId) {
      const delta = new OpenSeadragon.Point(this.panFrom.x - pointer.clientX, this.panFrom.y - pointer.clientY);
      viewer.viewport.panBy(viewer.viewport.deltaPointsFromPixels(delta, true), true);
      if (this.viewerSettings.constrainDuringPan) viewer.viewport.applyConstraints(true);
      this.panFrom = { ...this.panFrom, x: pointer.clientX, y: pointer.clientY };
      return;
    }
    if (this.drawingPointer === null || pointer.pointerId !== this.drawingPointer) return;
    const samples = typeof pointer.getCoalescedEvents === 'function' ? pointer.getCoalescedEvents() : [];
    (samples.length > 0 ? samples : [pointer]).forEach((sample) => {
      const point = this.toImage(sample);
      if (isFarEnough(this.stroke[this.stroke.length - 1], point, this.props.viewportScale)) this.addPoint(point);
    });
    this.render();
  };

  private readonly onPointerUp = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (this.panFrom && pointer.pointerId === this.panFrom.pointerId) {
      this.endPan();
      return;
    }
    if (this.drawingPointer === null || pointer.pointerId !== this.drawingPointer) return;
    const point = this.toImage(pointer);
    if (isFarEnough(this.stroke[this.stroke.length - 1], point, this.props.viewportScale)) this.addPoint(point);
    this.finish();
  };

  private readonly onPointerCancel = (event: Event): void => {
    const { pointerId } = event as PointerEvent;
    if (this.panFrom?.pointerId === pointerId) this.endPan();
    if (this.drawingPointer === pointerId) this.reset();
  };

  private readonly onWheel = (event: Event): void => {
    const viewer = this.viewer;
    const wheel = event as WheelEvent;
    if (!viewer) return;
    wheel.preventDefault();
    // Like OpenSeadragon: at most one zoom step per interval (touchpads send many wheel events).
    const now = performance.now();
    const minInterval = this.viewerSettings.minScrollDeltaTime ?? MIN_SCROLL_DELTA_TIME_MS;
    if (wheel.deltaY === 0 || now - this.lastWheelZoom < minInterval) return;
    this.lastWheelZoom = now;
    const step = this.viewerSettings.zoomPerScroll ?? ZOOM_PER_SCROLL;
    viewer.viewport.zoomBy(wheel.deltaY < 0 ? step : 1 / step, viewer.viewport.pointFromPixel(this.toElement(wheel), true));
    viewer.viewport.applyConstraints();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.drawingPointer !== null) this.reset();
  };
}
