import type { Annotation } from '../../../types/annotation';

/**
 * Layer keys: the model's cells, excluded areas, or the cells one author changed, confirmed or drew.
 *
 * The model's cells are one layer to the user, in three parts: the user's copies still waiting for them
 * (`PENDING_LAYER`, editable), the model's originals of those copies (`SHADOWED_LAYER`, never drawn: the copy is in
 * their place), and its other originals (`MODEL_LAYER`), which the user has dealt with or never copied.
 */
export const MODEL_LAYER = 'model';
export const PENDING_LAYER = 'model:pending';
export const SHADOWED_LAYER = 'model:shadowed';
export const EXCLUDED_LAYER = 'excluded';
const AUTHOR_PREFIX = 'author:';

export type AnnotationLayerKind = 'model' | 'author' | 'excluded';

/** Which of the model's cells are drawn: all of them, or only those still waiting for the user. */
export type ModelFilter = 'all' | 'remaining';

export interface AnnotationLayerInfo {
  key: string;
  kind: AnnotationLayerKind;
  label: string;
  count: number;
  /** The model's layer only: how many of its cells still wait for the user (none without a layer of their own). */
  remaining?: number;
}

/** In layers, only the author changes a shape: the model's cells and other people's are locked for `editableBy`. */
export const isLocked = (
  annotation: Pick<Annotation, 'source' | 'created_by_name'>,
  editableBy: string | undefined,
): boolean => editableBy !== undefined && (annotation.source === 'model' || annotation.created_by_name !== editableBy);

export const authorLayer = (username: string | null | undefined): string => `${AUTHOR_PREFIX}${username ?? ''}`;

/**
 * The layer of each annotation, by id. A model cell someone edited is theirs (the server marks it `human`); their copy
 * of one they have neither changed nor confirmed is still the model's, so their own layer shows what they dealt with.
 */
export const layersOf = (annotations: readonly Annotation[]): Map<string, string> => {
  const shadowed = new Set(annotations.filter((item) => item.untouched).map((item) => item.origin_id));
  return new Map(
    annotations.map((item) => {
      if (item.kind === 'excluded') return [item.id, EXCLUDED_LAYER];
      if (item.source === 'model') return [item.id, shadowed.has(item.id) ? SHADOWED_LAYER : MODEL_LAYER];
      return [item.id, item.untouched ? PENDING_LAYER : authorLayer(item.created_by_name)];
    }),
  );
};

/** The layer the user switches and fades a shape with: the parts of the model's layer are one to them. */
export const shownLayer = (layer: string): string =>
  layer === PENDING_LAYER || layer === SHADOWED_LAYER ? MODEL_LAYER : layer;

/**
 * The layers not drawn, given the ones the user switched off and their filter of the model's layer. `filter` is null
 * when the user has no layer of their own: there is nothing waiting for them, so all the model's cells are drawn.
 */
export const hiddenParts = (hiddenLayers: ReadonlySet<string>, filter: ModelFilter | null): Set<string> => {
  const hidden = new Set(hiddenLayers).add(SHADOWED_LAYER);
  if (hiddenLayers.has(MODEL_LAYER)) hidden.add(PENDING_LAYER);
  else if (filter === 'remaining') hidden.add(MODEL_LAYER);
  return hidden;
};

const KIND_ORDER: Record<AnnotationLayerKind, number> = { model: 0, author: 1, excluded: 2 };

const FIXED_LAYERS: Record<string, { kind: AnnotationLayerKind; label: string }> = {
  [MODEL_LAYER]: { kind: 'model', label: 'Model (Classpose)' },
  [EXCLUDED_LAYER]: { kind: 'excluded', label: 'Obszary wyłączone' },
};

/** The layers present among the annotations: the model first, then authors by name (unknown last), then areas. */
export const listLayers = (annotations: readonly Annotation[]): AnnotationLayerInfo[] => {
  const layers = new Map<string, AnnotationLayerInfo>();
  for (const part of layersOf(annotations).values()) {
    // The original under a waiting copy is the same cell: counted once, as the copy.
    if (part === SHADOWED_LAYER) continue;
    const key = shownLayer(part);
    const existing = layers.get(key);
    if (existing) {
      existing.count++;
      if (part === PENDING_LAYER) existing.remaining = (existing.remaining ?? 0) + 1;
      continue;
    }
    const { kind, label } = FIXED_LAYERS[key] ?? {
      kind: 'author',
      label: key.slice(AUTHOR_PREFIX.length) || 'Nieznany autor',
    };
    layers.set(key, { key, kind, label, count: 1, ...(part === PENDING_LAYER ? { remaining: 1 } : {}) });
  }
  return [...layers.values()].sort((a, b) => {
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    // Unknown author after the named ones.
    if (a.key === authorLayer(null)) return 1;
    if (b.key === authorLayer(null)) return -1;
    return a.label.localeCompare(b.label, 'pl');
  });
};
