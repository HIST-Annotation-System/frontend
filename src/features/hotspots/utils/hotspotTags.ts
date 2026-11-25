import type { BadgeTone } from '../../../components/ui/Badge';
import type { Tag, TagDimension } from '../../../types/tag';
import { getErrorMessage } from '../../../utils/errors';

export const TAG_DIMENSIONS: { value: TagDimension; label: string }[] = [
  { value: 'importance', label: 'Priorytet' },
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

export type PriorityLevel = 'high' | 'medium' | 'low';

/** An importance value's place among all of them, as in Jira: the heaviest is high, the lightest low. */
export function priorityLevel(tag: Tag, allTags: Tag[]): PriorityLevel {
  const values = dimensionTags(allTags, 'importance');
  const index = values.findIndex((item) => item.id === tag.id);
  // Not placed yet (the tag list is still loading): neutral rather than alarming.
  if (index === -1) return 'medium';
  if (index === 0) return 'high';
  if (index === values.length - 1) return 'low';
  return 'medium';
}

/** An accuracy value that marks the annotation as wrong (it weighs something; "correct" weighs nothing). */
export const isWrongAccuracy = (tag: Tag): boolean => tag.weight > 0;

/** Custom tags get one of these pill colours, always the same for a tag. */
export const TAG_COLOR_COUNT = 8;

export const tagColorIndex = (tag: Pick<Tag, 'id'>): number => tag.id % TAG_COLOR_COUNT;

/** The API's weight errors (backend services/tags.py) arrive in English; everything else as it comes. */
export function tagErrorMessage(error: unknown, fallback: string): string {
  const message = getErrorMessage(error, fallback);
  const cap = /^Custom tags must weigh less than (\d+)/.exec(message)?.[1];
  if (cap) return `Waga tagu własnego musi być mniejsza niż ${cap} (najmniejsza niezerowa waga oceny).`;
  const conflict = /^Custom tags would outweigh the core tags; lower them below (\d+) first: (.*)\.$/.exec(message);
  if (conflict) return `Tagi własne ważyłyby więcej niż oceny. Najpierw zmniejsz poniżej ${conflict[1]}: ${conflict[2]}.`;
  return message;
}
