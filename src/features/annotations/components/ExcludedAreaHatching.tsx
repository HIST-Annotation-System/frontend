import OpenSeadragon from 'openseadragon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import { createAnnotationAdapter, getAnnotationKind } from '../utils/annotationAdapter';
import './AnnotationTools.css';

/** Stripe spacing and width in screen pixels: the same at every zoom. */
const HATCH_SPACING_PX = 8;
const HATCH_WIDTH_PX = 1.5;
/** A shade darker than the areas' grey fill (EXCLUDED_ANNOTATION_COLOR), so the stripes read on top of it. */
const HATCH_COLOR = '#374151';
const PATTERN_ID = 'excluded-area-hatch';

/**
 * Diagonal hatching over the excluded areas, the usual mark of a no-go zone. Annotorious draws shapes with
 * PixiJS (plain fills only), so the stripes are an SVG layer that ignores the mouse, placed right above its canvas
 * and below its editor (handles stay on top). The areas' outlines (image pixels) are rebuilt only when the
 * annotations change; panning or zooming just moves one transform.
 */
export default function ExcludedAreaHatching() {
  const anno = useSlideAnnotator();
  const groupRef = useRef<SVGGElement>(null);
  const patternRef = useRef<SVGPatternElement>(null);
  const [paths, setPaths] = useState<{ id: string; d: string }[]>([]);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  // Zero offset: outlines stay in the viewer's image pixels, the space the transform below maps to the screen.
  const adapter = useMemo(() => createAnnotationAdapter({ x: 0, y: 0 }), []);

  useEffect(() => {
    if (!anno) return undefined;
    const container = anno.viewer.canvas;
    const layer = document.createElement('div');
    layer.className = 'excluded-hatching';
    const fills = container.querySelector('.a9s-gl-canvas');
    if (fills) fills.after(layer);
    else container.appendChild(layer);
    setHost(layer);
    return () => {
      layer.remove();
      setHost(null);
    };
  }, [anno]);

  useEffect(() => {
    if (!anno) return undefined;
    const { store } = anno.state;
    const rebuild = () =>
      setPaths(
        store
          .all()
          .filter((annotation) => getAnnotationKind(annotation) === 'excluded')
          .map((annotation) => {
            const ring = adapter.serialize(annotation).geometry.coordinates[0];
            return { id: annotation.id, d: `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z` };
          }),
      );
    store.observe(rebuild);
    rebuild();
    return () => store.unobserve(rebuild);
  }, [anno, adapter]);

  useEffect(() => {
    if (!anno) return undefined;
    const { viewer } = anno;
    // The image maps to the screen by a scale and a shift (no rotation): two points give both.
    const follow = () => {
      const image = viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;
      const group = groupRef.current;
      const pattern = patternRef.current;
      if (!image || !group || !pattern) return;
      const origin = image.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
      const unit = image.imageToViewerElementCoordinates(new OpenSeadragon.Point(1, 0));
      const scale = unit.x - origin.x;
      if (!(scale > 0)) return;
      group.setAttribute('transform', `matrix(${scale} 0 0 ${scale} ${origin.x} ${origin.y})`);
      // The pattern lives in image pixels: shrinking it by the zoom keeps the stripes fixed on screen.
      pattern.setAttribute('patternTransform', `scale(${1 / scale}) rotate(45)`);
    };
    viewer.addHandler('update-viewport', follow);
    viewer.addHandler('resize', follow);
    viewer.world.addHandler('add-item', follow);
    follow();
    return () => {
      viewer.removeHandler('update-viewport', follow);
      viewer.removeHandler('resize', follow);
      viewer.world.removeHandler('add-item', follow);
    };
  }, [anno, host]);

  if (!host) return null;
  return createPortal(
    <svg aria-hidden="true">
      <defs>
        <pattern
          ref={patternRef}
          id={PATTERN_ID}
          patternUnits="userSpaceOnUse"
          width={HATCH_SPACING_PX}
          height={HATCH_SPACING_PX}
        >
          <line
            x1={HATCH_SPACING_PX / 2}
            y1="0"
            x2={HATCH_SPACING_PX / 2}
            y2={HATCH_SPACING_PX}
            stroke={HATCH_COLOR}
            strokeWidth={HATCH_WIDTH_PX}
          />
        </pattern>
      </defs>
      <g ref={groupRef}>
        {paths.map(({ id, d }) => (
          <path key={id} d={d} fill={`url(#${PATTERN_ID})`} />
        ))}
      </g>
    </svg>,
    host,
  );
}
