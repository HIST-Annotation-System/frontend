import type { BadgeTone } from '../../../components/ui/Badge';
import type { Tag, TagDimension } from '../../../types/tag';

export const TAG_DIMENSIONS: { value: TagDimension; label: string }[] = [
  { value: 'importance', label: 'Ważność' },
  { value: 'accuracy', label: 'Poprawność' },
];

export const TAG_WEIGHT_MAX = 1000;
export const CUSTOM_TAG_DEFAULT_WEIGHT = 5;

/** A dimension's values, heaviest first. */
export const dimensionTags = (tags: Tag[], dimension: TagDimension): Tag[] =>
  tags.filter((tag) => tag.dimension === dimension).sort((a, b) => b.weight - a.weight);

export const customTags = (tags: Tag[]): Tag[] => tags.filter((tag) => tag.dimension === null);

/**
 * Custom tags must weigh less than this (the lightest non-zero core tag), so the core verdicts always dominate;
 * null when no core tag weighs anything.
 */
export function customWeightCap(tags: Tag[]): number | null {
  const weights = tags.filter((tag) => tag.dimension !== null && tag.weight > 0).map((tag) => tag.weight);
  return weights.length > 0 ? Math.min(...weights) : null;
}

/** The heaviest custom weight allowed. */
export const maxCustomWeight = (tags: Tag[]): number => {
  const cap = customWeightCap(tags);
  return cap === null ? TAG_WEIGHT_MAX : cap - 1;
};

export function tagLabel(tag: Tag): string {
  const dimension = TAG_DIMENSIONS.find((item) => item.value === tag.dimension);
  return dimension ? `${dimension.label}: ${tag.name}` : tag.name;
}

/**
 * A wrong annotation and the highest importance (the heaviest value among `allTags`) stand out, a correct annotation
 * is reassuring, other importance values are informative and custom tags neutral.
 */
export function tagTone(tag: Tag, allTags: Tag[]): BadgeTone {
  if (tag.dimension === 'accuracy') return tag.weight > 0 ? 'danger' : 'success';
  if (tag.dimension === 'importance') {
    return dimensionTags(allTags, 'importance')[0]?.id === tag.id ? 'danger' : 'info';
  }
  return 'neutral';
}
