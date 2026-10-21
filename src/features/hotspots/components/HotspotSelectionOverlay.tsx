import OpenSeadragon from 'openseadragon';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';
import { useLatest } from '../../../hooks/useLatest';
import type { Offset, Position, Rect } from '../../../types/geometry';
import type { HotspotBatch } from '../../../types/hotspot';
import type { SlideDetail } from '../../../types/slide';
import { useOsdViewer } from '../../viewer/hooks/useOsdViewer';
import { useSlideHotspots } from '../hooks/useHotspots';
import { formatSquareSize } from '../utils/hotspotFormat';
import {
  boxKey,
  brushBoxAt,
  contains,
  dragRange,
  gridBoxAt,
  HOTSPOT_BOX_SIZE,
  isCentredIn,
  isInside,
  MAX_BATCH_BOXES,
  overlaps,
  rangeBoxes,
  rangeRect,
  sameRange,
  strokePoints,
  type Box,
  type GridRange,
  type HotspotTool,
} from '../utils/hotspotBoxes';
import CreateHotspotBatchModal from './CreateHotspotBatchModal';
import './Hotspots.css';

type Boxes = ReadonlyMap<string, Box>;

const NO_BOXES: Boxes = new Map();

/** A grid drag shown while it lasts: the area, and the boxes it would add (null when over the limit). */
interface GridPreview {
  remove: boolean;
  area: Rect;
  boxes: Box[] | null;
}

/** The drag in progress, kept outside React state so pointer events never wait for a render. */
interface ActiveDrag {
  tool: HotspotTool;
  remove: boolean;
  start: Position;
  last: Position;
  range: GridRange | null;
}

const RIGHT_BUTTON = 2;

/** Polish plural of "pole" (field) for a count. */
const fieldsWord = (count: number) => {
  if (count === 1) return 'pole';
  const tens = count % 100;
  return count % 10 >= 2 && count % 10 <= 4 && (tens < 12 || tens > 14) ? 'pola' : 'pól';
};

interface HotspotSelectionOverlayProps {
  slide: SlideDetail;
  /** The active tool; with none, dragging pans the slide and the chosen boxes just stay shown. */
  tool: HotspotTool | null;
  onToolChange: (tool: HotspotTool | null) => void;
  onCreated: (batch: HotspotBatch) => void;
  /** Inspector panel element that receives the selection summary and its actions. */
  panelTarget: HTMLElement | null;
  /** Status bar element that receives the tool hint. */
  hintTarget: HTMLElement | null;
}

/**
 * Choosing slide boxes to turn into hotspots, with two tools sharing one selection:
 * - grid: the first drag anchors a grid of fixed-size boxes at its start point; later drags add boxes of
 *   that same grid and a click adds or removes one box;
 * - brush: painting places boxes centred on the pointer wherever they don't overlap a chosen one.
 * With either tool a right-drag removes boxes and the wheel still zooms. Esc goes back to panning without
 * losing the boxes. Nothing is saved before the confirmation dialog.
 *
 * The boxes are drawn in level-0 slide pixels inside one SVG group whose transform follows the viewport
 * in the same frame OpenSeadragon draws, so they never trail the image while panning or zooming.
 */
export default function HotspotSelectionOverlay({
  slide,
  tool,
  onToolChange,
  onCreated,
  panelTarget,
  hintTarget,
}: HotspotSelectionOverlayProps) {
  const viewer = useOsdViewer();
  const { data: existing = [] } = useSlideHotspots(slide.id);
  const layerRef = useRef<SVGGElement>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  // Where the grid is anchored; kept while any box is chosen, so later grid drags match earlier ones.
  const gridOriginRef = useRef<Offset | null>(null);
  const chosenRef = useRef<Boxes>(NO_BOXES);
  const [chosen, setChosen] = useState<Boxes>(NO_BOXES);
  const [preview, setPreview] = useState<GridPreview | null>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [pendingBoxes, setPendingBoxes] = useState<Box[] | null>(null);

  const slideSize = { width: slide.width ?? 0, height: slide.height ?? 0 };
  const latest = useLatest({ tool, pendingBoxes, slideSize, offset: slide.image_offset });

  /** Replaces the chosen boxes, unless that would exceed the limit (then false). */
  const choose = (next: Map<string, Box>): boolean => {
    if (next.size > MAX_BATCH_BOXES) {
      setIsOverLimit(true);
      return false;
    }
    setIsOverLimit(false);
    chosenRef.current = next;
    setChosen(next);
    // Without boxes there is no grid left to keep matching.
    if (next.size === 0) gridOriginRef.current = null;
    return true;
  };
  const latestChoose = useLatest(choose);
  const clear = () => choose(new Map());

  // Keeps the layer on the image: level-0 pixels -> viewer pixels, recomputed whenever OpenSeadragon redraws.
  const { x: offsetX, y: offsetY } = slide.image_offset;
  useEffect(() => {
    if (!viewer) return undefined;
    const follow = () => {
      const image = viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;
      if (!image || !layerRef.current) return;
      const zero = image.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
      const unit = image.imageToViewerElementCoordinates(new OpenSeadragon.Point(HOTSPOT_BOX_SIZE, 0));
      const scale = (unit.x - zero.x) / HOTSPOT_BOX_SIZE;
      layerRef.current.setAttribute(
        'transform',
        `matrix(${scale} 0 0 ${scale} ${zero.x - offsetX * scale} ${zero.y - offsetY * scale})`,
      );
    };
    viewer.addHandler('open', follow);
    viewer.addHandler('update-viewport', follow);
    viewer.addHandler('resize', follow);
    follow();
    return () => {
      viewer.removeHandler('open', follow);
      viewer.removeHandler('update-viewport', follow);
      viewer.removeHandler('resize', follow);
    };
  }, [viewer, offsetX, offsetY]);

  // Input: left-drag through OpenSeadragon (which would otherwise pan), right-drag and the brush cursor
  // through native pointer events (OpenSeadragon reports no right-drag), clicks for single grid boxes.
  useEffect(() => {
    if (!viewer) return undefined;
    const toSlide = (position: OpenSeadragon.Point): Position | null => {
      const image = viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;
      if (!image) return null;
      const point = image.viewerElementToImageCoordinates(position);
      const { offset } = latest.current;
      return [point.x + offset.x, point.y + offset.y];
    };
    const clientToSlide = (event: PointerEvent): Position | null => {
      const bounds = viewer.canvas.getBoundingClientRect();
      return toSlide(new OpenSeadragon.Point(event.clientX - bounds.left, event.clientY - bounds.top));
    };
    const activeTool = () => (latest.current.pendingBoxes ? null : latest.current.tool);

    /** Paints (or erases) along the brush stroke up to `to`. */
    const paint = (current: ActiveDrag, to: Position) => {
      const next = new Map(chosenRef.current);
      for (const point of current.last === to ? [to] : strokePoints(current.last, to)) {
        if (current.remove) {
          next.forEach((box, key) => contains(box, point) && next.delete(key));
          continue;
        }
        const box = brushBoxAt(point, latest.current.slideSize);
        if (!box || [...next.values()].some((other) => overlaps(box, other))) continue;
        if (next.size === MAX_BATCH_BOXES) {
          setIsOverLimit(true);
          break;
        }
        next.set(boxKey(box), box);
      }
      current.last = to;
      if (next.size !== chosenRef.current.size) latestChoose.current(next);
    };

    /** A grid drag moved to `end`: re-renders only when the pointer enters another box. */
    const stretch = (current: ActiveDrag, end: Position) => {
      if (!gridOriginRef.current) {
        // The first grid drag anchors the grid at its start point.
        gridOriginRef.current = { x: Math.round(current.start[0]), y: Math.round(current.start[1]) };
      }
      const origin = gridOriginRef.current;
      const range = dragRange(origin, current.start, end);
      if (current.range && sameRange(current.range, range)) return;
      current.range = range;
      setPreview({
        remove: current.remove,
        area: rangeRect(origin, range),
        boxes: current.remove ? [] : rangeBoxes(origin, range, latest.current.slideSize),
      });
    };

    const begin = (remove: boolean, start: Position | null) => {
      const current = activeTool();
      if (!current || !start) return;
      // A grid right-drag needs a grid to remove from.
      if (current === 'grid' && remove && !gridOriginRef.current) return;
      dragRef.current = { tool: current, remove, start, last: start, range: null };
      if (current === 'brush') paint(dragRef.current, start);
    };
    const move = (end: Position | null) => {
      const current = dragRef.current;
      if (!current || !end) return;
      if (current.tool === 'brush') paint(current, end);
      else stretch(current, end);
    };
    const finish = () => {
      const current = dragRef.current;
      dragRef.current = null;
      const origin = gridOriginRef.current;
      if (current?.tool !== 'grid' || !current.range || !origin) return;
      setPreview(null);
      const next = new Map(chosenRef.current);
      if (current.remove) {
        const area = rangeRect(origin, current.range);
        next.forEach((box, key) => isCentredIn(box, area) && next.delete(key));
      } else {
        const boxes = rangeBoxes(origin, current.range, latest.current.slideSize);
        if (!boxes) {
          setIsOverLimit(true);
          if (next.size === 0) gridOriginRef.current = null;
          return;
        }
        boxes.forEach((box) => next.set(boxKey(box), box));
      }
      latestChoose.current(next);
    };

    const onPress = (event: OpenSeadragon.CanvasPressEvent) => begin(false, toSlide(event.position));
    const onDrag = (event: OpenSeadragon.CanvasDragEvent) => {
      if (!dragRef.current || dragRef.current.remove) return;
      event.preventDefaultAction = true;
      move(toSlide(event.position));
    };
    const onDragEnd = (event: Omit<OpenSeadragon.CanvasDragEvent, 'delta'>) => {
      if (!dragRef.current || dragRef.current.remove) return;
      event.preventDefaultAction = true;
      finish();
    };
    const onClick = (event: OpenSeadragon.CanvasClickEvent) => {
      const current = activeTool();
      if (!current || !event.quick) return;
      // The brush already painted on press.
      event.preventDefaultAction = true;
      const point = toSlide(event.position);
      const origin = gridOriginRef.current;
      if (current !== 'grid' || !point || !origin) return;
      const box = gridBoxAt(origin, point);
      if (!isInside(box, latest.current.slideSize)) return;
      const next = new Map(chosenRef.current);
      if (!next.delete(boxKey(box))) next.set(boxKey(box), box);
      latestChoose.current(next);
    };

    const showCursor = (point: Position | null) => {
      const cursor = cursorRef.current;
      const box = point && activeTool() === 'brush' ? brushBoxAt(point, latest.current.slideSize) : null;
      if (!cursor) return;
      cursor.style.visibility = box ? 'visible' : 'hidden';
      if (box) {
        cursor.setAttribute('x', String(box.x));
        cursor.setAttribute('y', String(box.y));
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      const point = clientToSlide(event);
      showCursor(point);
      if (dragRef.current?.remove) move(point);
    };
    const onPointerLeave = () => showCursor(null);
    const onPointerUp = (event: PointerEvent) => {
      if (event.button === RIGHT_BUTTON && dragRef.current?.remove) finish();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === RIGHT_BUTTON) begin(true, clientToSlide(event));
    };
    // The browser menu would interrupt a right-drag.
    const onContextMenu = (event: MouseEvent) => {
      if (activeTool()) event.preventDefault();
    };

    viewer.addHandler('canvas-press', onPress);
    viewer.addHandler('canvas-drag', onDrag);
    viewer.addHandler('canvas-drag-end', onDragEnd);
    viewer.addHandler('canvas-click', onClick);
    // Capture phase: OpenSeadragon's own listeners on the canvas stop its pointer events from bubbling.
    viewer.element.addEventListener('pointerdown', onPointerDown, true);
    viewer.element.addEventListener('pointerleave', onPointerLeave);
    viewer.element.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    return () => {
      viewer.removeHandler('canvas-press', onPress);
      viewer.removeHandler('canvas-drag', onDrag);
      viewer.removeHandler('canvas-drag-end', onDragEnd);
      viewer.removeHandler('canvas-click', onClick);
      viewer.element.removeEventListener('pointerdown', onPointerDown, true);
      viewer.element.removeEventListener('pointerleave', onPointerLeave);
      viewer.element.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };
  }, [viewer, latest, latestChoose]);

  useEffect(() => {
    if (tool !== 'brush') cursorRef.current?.style.setProperty('visibility', 'hidden');
  }, [tool]);

  // Esc goes back to panning; the chosen boxes stay (the dialog handles its own Esc while open).
  useEffect(() => {
    if (!tool || pendingBoxes) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToolChange(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tool, pendingBoxes, onToolChange]);

  const rect = (key: string, area: Rect, className: string) => (
    <rect
      key={key}
      className={className}
      x={area.x}
      y={area.y}
      width={area.width}
      height={area.height}
      vectorEffect="non-scaling-stroke"
    />
  );
  const square = (box: Box) => ({ ...box, width: HOTSPOT_BOX_SIZE, height: HOTSPOT_BOX_SIZE });

  const tooManyInDrag = preview && !preview.boxes;
  const tooMany = Boolean(isOverLimit || tooManyInDrag);
  const count = chosen.size;
  let hint: string | null = null;
  if (tooMany) hint = `Za dużo pól: najwyżej ${MAX_BATCH_BOXES} naraz`;
  else if (tool === 'grid')
    hint = `Siatka: przeciągnij, aby zaznaczyć pola ${formatSquareSize(HOTSPOT_BOX_SIZE, slide.mpp_x)}; prawy przycisk usuwa; Esc kończy`;
  else if (tool === 'brush')
    hint = `Pędzel: maluj, aby stawiać pola ${formatSquareSize(HOTSPOT_BOX_SIZE, slide.mpp_x)}; prawy przycisk usuwa; Esc kończy`;

  return (
    <>
      <div className={`hotspot-grid${tool ? ' hotspot-grid--active' : ''}`}>
        <svg className="hotspot-grid__layer" aria-hidden="true">
          <g ref={layerRef}>
            {tool &&
              existing.map(
                (hotspot) =>
                  hotspot.x !== null &&
                  hotspot.y !== null &&
                  hotspot.size !== null &&
                  rect(hotspot.id, { x: hotspot.x, y: hotspot.y, width: hotspot.size, height: hotspot.size }, 'hotspot-grid__existing'),
              )}
            {[...chosen].map(([key, box]) =>
              rect(
                key,
                square(box),
                preview?.remove && isCentredIn(box, preview.area)
                  ? 'hotspot-grid__box hotspot-grid__box--removing'
                  : 'hotspot-grid__box',
              ),
            )}
            {preview?.boxes?.map(
              (box) => !chosen.has(boxKey(box)) && rect(`add-${boxKey(box)}`, square(box), 'hotspot-grid__box hotspot-grid__box--adding'),
            )}
            {tooManyInDrag && rect('too-many', preview.area, 'hotspot-grid__box hotspot-grid__box--too-many')}
            <rect
              ref={cursorRef}
              className="hotspot-grid__cursor"
              width={HOTSPOT_BOX_SIZE}
              height={HOTSPOT_BOX_SIZE}
              vectorEffect="non-scaling-stroke"
              visibility="hidden"
            />
          </g>
        </svg>
        {hint &&
          hintTarget &&
          createPortal(
            <span className={`viewer-status__hint${tooMany ? ' viewer-status__hint--error' : ''}`}>{hint}</span>,
            hintTarget,
          )}
        {panelTarget &&
          createPortal(
            count === 0 ? (
              <p className="text-muted">Wybierz Siatkę (G) lub Pędzel (B) i zaznacz pola na slajdzie.</p>
            ) : (
              <>
                <p>
                  <span className="tabular">{count}</span> {fieldsWord(count)}{' '}
                  {formatSquareSize(HOTSPOT_BOX_SIZE, slide.mpp_x)}
                </p>
                <Button variant="primary" block onClick={() => setPendingBoxes([...chosen.values()])}>
                  Utwórz hotspoty…
                </Button>
                <Button
                  block
                  title="Następne przeciągnięcie siatką zacznie nową siatkę"
                  onClick={clear}
                >
                  Wyczyść zaznaczenie
                </Button>
              </>
            ),
            panelTarget,
          )}
      </div>
      {/* Outside the overlay: it sets pointer-events: none (inherited), which would make the dialog unclickable. */}
      {pendingBoxes && (
        <CreateHotspotBatchModal
          slide={slide}
          boxes={pendingBoxes}
          onClose={() => setPendingBoxes(null)}
          onCreated={(batch) => {
            setPendingBoxes(null);
            clear();
            onCreated(batch);
          }}
        />
      )}
    </>
  );
}
