import type { Annotation } from '../../../types/annotation';

/** Layer keys: the model's untouched cells, excluded areas, or the cells of one author. */
export const MODEL_LAYER = 'model';
export const EXCLUDED_LAYER = 'excluded';
const AUTHOR_PREFIX = 'author:';

export type AnnotationLayerKind = 'model' | 'author' | 'excluded';

export interface AnnotationLayerInfo {
  key: string;
  kind: AnnotationLayerKind;
  label: string;
  count: number;
}

export const authorLayer = (username: string | null | undefined): string => `${AUTHOR_PREFIX}${username ?? ''}`;

/** The layer an annotation is shown in. A model cell someone edited is theirs (the server marks it `human`). */
export const layerOf = (annotation: Pick<Annotation, 'kind' | 'source' | 'created_by_name'>): string => {
  if (annotation.kind === 'excluded') return EXCLUDED_LAYER;
  if (annotation.source === 'model') return MODEL_LAYER;
  return authorLayer(annotation.created_by_name);
};

const KIND_ORDER: Record<AnnotationLayerKind, number> = { model: 0, author: 1, excluded: 2 };

/** The layers present among the annotations: the model first, then authors by name (unknown last), then areas. */
export const listLayers = (annotations: readonly Annotation[]): AnnotationLayerInfo[] => {
  const layers = new Map<string, AnnotationLayerInfo>();
  for (const annotation of annotations) {
    const key = layerOf(annotation);
    const existing = layers.get(key);
    if (existing) {
      existing.count++;
      continue;
    }
    const kind: AnnotationLayerKind =
      key === MODEL_LAYER ? 'model' : key === EXCLUDED_LAYER ? 'excluded' : 'author';
    const name = key.slice(AUTHOR_PREFIX.length);
    const label =
      kind === 'model' ? 'Model (Cellpose-SAM)' : kind === 'excluded' ? 'Obszary wyłączone' : name || 'Nieznany autor';
    layers.set(key, { key, kind, label, count: 1 });
  }
  return [...layers.values()].sort((a, b) => {
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    // Unknown author after the named ones.
    if (a.key === authorLayer(null)) return 1;
    if (b.key === authorLayer(null)) return -1;
    return a.label.localeCompare(b.label, 'pl');
  });
};
