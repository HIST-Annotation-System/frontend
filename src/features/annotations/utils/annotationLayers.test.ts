import { describe, expect, it } from 'vitest';
import type { Annotation } from '../../../types/annotation';
import type { CellType } from '../../../types/cellType';
import {
  EXCLUDED_LAYER,
  MODEL_LAYER,
  PENDING_LAYER,
  SHADOWED_LAYER,
  authorLayer,
  hiddenParts,
  isLocked,
  layersOf,
  listLayers,
  shownLayer,
} from './annotationLayers';
import { FALLBACK_CELL_TYPE_COLOR, assignCellTypeColors } from './cellTypeColors';
import { findCellTypeByName, normalizeCellTypeName } from './cellTypeNames';

const annotation = (id: string, extra: Partial<Annotation> = {}): Annotation => ({
  id,
  kind: 'cell',
  source: 'human',
  class_id: '1',
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  created_at: '2026-01-01T00:00:00Z',
  ...extra,
});

describe('annotation layers', () => {
  const modelCell = annotation('m1', { source: 'model', created_by_name: null });
  const copiedModelCell = annotation('m2', { source: 'model', created_by_name: null });
  const waitingCopy = annotation('c2', { created_by_name: 'anna', origin_id: 'm2', untouched: true });
  const annasCell = annotation('a1', { created_by_name: 'anna' });
  const bobsCell = annotation('b1', { created_by_name: 'Bob' });
  const orphanCell = annotation('o1', { created_by_name: null });
  const area = annotation('x1', { kind: 'excluded', class_id: null, created_by_name: 'anna' });
  const all = [modelCell, copiedModelCell, waitingCopy, annasCell, bobsCell, orphanCell, area];

  it('locks the model and other people only when editing in layers', () => {
    expect(isLocked(modelCell, undefined)).toBe(false);
    expect(isLocked(annasCell, undefined)).toBe(false);
    expect(isLocked(modelCell, 'anna')).toBe(true);
    expect(isLocked(bobsCell, 'anna')).toBe(true);
    expect(isLocked(annasCell, 'anna')).toBe(false);
  });

  it('puts each annotation in its layer', () => {
    expect(Object.fromEntries(layersOf(all))).toEqual({
      m1: MODEL_LAYER,
      m2: SHADOWED_LAYER,
      c2: PENDING_LAYER,
      a1: 'author:anna',
      b1: 'author:Bob',
      o1: 'author:',
      x1: EXCLUDED_LAYER,
    });
    expect(authorLayer(undefined)).toBe('author:');
  });

  it('shows the parts of the model layer as one', () => {
    expect(shownLayer(PENDING_LAYER)).toBe(MODEL_LAYER);
    expect(shownLayer(SHADOWED_LAYER)).toBe(MODEL_LAYER);
    expect(shownLayer('author:anna')).toBe('author:anna');
  });

  it('hides the shadowed originals always, and the rest by the user and filter', () => {
    expect(hiddenParts(new Set(), null)).toEqual(new Set([SHADOWED_LAYER]));
    expect(hiddenParts(new Set(), 'all')).toEqual(new Set([SHADOWED_LAYER]));
    expect(hiddenParts(new Set(), 'remaining')).toEqual(new Set([SHADOWED_LAYER, MODEL_LAYER]));
    expect(hiddenParts(new Set([MODEL_LAYER]), 'remaining')).toEqual(
      new Set([MODEL_LAYER, SHADOWED_LAYER, PENDING_LAYER]),
    );
  });

  it('lists the model first, then authors by name with the unknown author last, then areas', () => {
    expect(listLayers(all)).toEqual([
      { key: MODEL_LAYER, kind: 'model', label: 'Model (Classpose)', count: 2, remaining: 1 },
      { key: 'author:anna', kind: 'author', label: 'anna', count: 1 },
      { key: 'author:Bob', kind: 'author', label: 'Bob', count: 1 },
      { key: 'author:', kind: 'author', label: 'Nieznany autor', count: 1 },
      { key: EXCLUDED_LAYER, kind: 'excluded', label: 'Obszary wyłączone', count: 1 },
    ]);
    expect(listLayers([])).toEqual([]);
  });
});

describe('cell type colours', () => {
  it('assigns palette colours in order of first use and keeps existing ones', () => {
    const first = assignCellTypeColors(new Map(), [5, 2, 5]);
    expect([...first.keys()]).toEqual([5, 2]);
    const second = assignCellTypeColors(first, [2, 9]);
    expect(second.get(5)).toBe(first.get(5));
    expect(second.get(2)).toBe(first.get(2));
    expect(new Set(second.values()).size).toBe(3);
  });

  it('wraps around the palette', () => {
    const ids = Array.from({ length: 11 }, (_, index) => index);
    const colours = assignCellTypeColors(new Map(), ids);
    expect(colours.get(10)).toBe(colours.get(0));
    expect(colours.get(9)).toBe(FALLBACK_CELL_TYPE_COLOR);
  });

  it('does not change the map it was given', () => {
    const existing = new Map([[1, '#000']]);
    assignCellTypeColors(existing, [2]);
    expect(existing.size).toBe(1);
  });
});

describe('cell type names', () => {
  const types: CellType[] = [
    { id: 1, name: 'CD8 T cell' },
    { id: 2, name: 'Tumor' },
  ];

  it('normalizes like the backend', () => {
    expect(normalizeCellTypeName('  CD8   T\tcell ')).toBe('CD8 T cell');
    expect(normalizeCellTypeName('   ')).toBe('');
  });

  it('finds a type by name ignoring case and spacing', () => {
    expect(findCellTypeByName(types, ' cd8  t CELL')?.id).toBe(1);
    expect(findCellTypeByName(types, 'Stroma')).toBeUndefined();
    expect(findCellTypeByName(types, '   ')).toBeUndefined();
  });

  it('skips the type being renamed', () => {
    expect(findCellTypeByName(types, 'TUMOR', 2)).toBeUndefined();
    expect(findCellTypeByName(types, 'TUMOR', 1)?.id).toBe(2);
  });
});
