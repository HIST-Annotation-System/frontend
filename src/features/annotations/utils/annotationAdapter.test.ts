// @vitest-environment jsdom
// (@annotorious/react loads OpenSeadragon, which needs a DOM at import time.)
import { ShapeType, type ImageAnnotation, type Rectangle } from '@annotorious/react';
import { describe, expect, it } from 'vitest';
import type { AnnotationDraft } from '../../../types/annotation';
import { createAnnotationAdapter, getAnnotationClassId } from './annotationAdapter';
import { createAnnotationStyle } from './annotationStyle';

const offset = { x: 1000, y: 500 };
const adapter = createAnnotationAdapter(offset);

const draft: AnnotationDraft = {
  id: 'annotation-1',
  class_id: 'class-cancer',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [1100, 600],
        [1300, 600],
        [1200, 800],
        [1100, 600],
      ],
    ],
  },
  curve: null,
};

const parse = (value: AnnotationDraft): ImageAnnotation => {
  const { parsed, error } = adapter.parse(value);
  if (!parsed) throw error ?? new Error('parse failed');
  return parsed;
};

describe('annotation adapter', () => {
  it('parses level-0 GeoJSON into a closed path of corners in image coordinates', () => {
    const annotation = parse(draft);

    expect(annotation.target.selector).toEqual({
      type: ShapeType.POLYLINE,
      geometry: {
        points: [
          { type: 'CORNER', point: [100, 100] },
          { type: 'CORNER', point: [300, 100] },
          { type: 'CORNER', point: [200, 300] },
        ],
        closed: true,
        bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
      },
    });
    expect(getAnnotationClassId(annotation)).toBe('class-cancer');
  });

  it('round-trips back to the API representation', () => {
    expect(adapter.serialize(parse(draft))).toEqual(draft);
  });

  it('serializes a freshly drawn shape without a class', () => {
    expect(adapter.serialize(parse({ ...draft, class_id: null })).class_id).toBeNull();
  });

  it('serializes rectangles as closed polygons', () => {
    const selector: Rectangle = {
      type: ShapeType.RECTANGLE,
      geometry: { x: 0, y: 0, w: 10, h: 20, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 20 } },
    };
    const rectangle: ImageAnnotation = { id: 'r', bodies: [], target: { annotation: 'r', selector } };

    expect(adapter.serialize(rectangle).geometry.coordinates[0]).toEqual([
      [1000, 500],
      [1010, 500],
      [1010, 520],
      [1000, 520],
      [1000, 500],
    ]);
  });
});

describe('annotation style', () => {
  const style = createAnnotationStyle(new Map([['class-cancer', '#ef4444']]), '#22c55e');

  it('uses the class colour and emphasises the selection', () => {
    expect(style(parse(draft))).toMatchObject({ fill: '#ef4444', stroke: '#ef4444', fillOpacity: 0.25 });
    expect(style(parse(draft), { selected: true })).toMatchObject({ fill: '#ef4444', stroke: '#ffd400', fillOpacity: 0.4 });
  });

  it('uses the pending colour for shapes without a class', () => {
    expect(style(parse({ ...draft, class_id: null }))).toMatchObject({ fill: '#22c55e' });
  });
});
