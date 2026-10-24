import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tag } from '../../../types/tag';
import { useTags } from '../hooks/useTags';
import {
  isWrongAccuracy,
  priorityLevel,
  TAG_DIMENSIONS,
  tagLabel,
  type PriorityLevel,
} from '../utils/hotspotTags';
import './TagMarks.css';

const PRIORITY_BARS: Record<PriorityLevel, number> = { high: 3, medium: 2, low: 1 };

/** A priority as signal bars (like a phone's signal strength): three for high, two for medium, one for low. */
function PriorityBars({ level, size }: { level: PriorityLevel; size: number }) {
  return (
    <span className="priority-bars" style={{ height: size }} aria-hidden="true">
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={`priority-bars__bar${bar <= PRIORITY_BARS[level] ? ' priority-bars__bar--on' : ''}`}
          style={{ height: `${(bar / 3) * 100}%` }}
        />
      ))}
    </span>
  );
}

interface VerdictMarkProps {
  /** A priority or accuracy value. */
  tag: Tag;
  /** Every tag, to place a priority among its values. */
  allTags: Tag[];
  /** The value's name beside the icon; otherwise it is in the tooltip. */
  labelled?: boolean;
  size?: number;
}

/** A priority as signal bars (high, medium, low) or an accuracy as a tick (correct) or a cross (wrong). */
export function VerdictMark({ tag, allTags, labelled = false, size = 16 }: VerdictMarkProps) {
  const wrong = isWrongAccuracy(tag);
  const level = priorityLevel(tag, allTags);
  const accuracy = tag.dimension === 'accuracy';
  const variant = accuracy ? (wrong ? 'wrong' : 'correct') : `priority-${level}`;
  const Icon = wrong ? X : Check;

  return (
    <span className={`tag-mark tag-mark--${variant}`} title={labelled ? undefined : tagLabel(tag)}>
      {accuracy ? <Icon size={size} strokeWidth={2.75} aria-hidden="true" /> : <PriorityBars level={level} size={size - 2} />}
      {labelled ? <span className="tag-mark__label">{tag.name}</span> : <span className="visually-hidden">{tagLabel(tag)}</span>}
    </span>
  );
}

/** A custom tag as an outlined pill. */
export function TagPill({ tag, children }: { tag: Tag; children?: ReactNode }) {
  return (
    <span className="tag-pill" title={tagLabel(tag)}>
      <span className="tag-pill__name">{tag.name}</span>
      {children}
    </span>
  );
}

/** The first `max` custom tags as pills, then "+N" for the rest (its tooltip names them), on one line. */
export function CustomTagPills({ tags, max }: { tags: Tag[]; max: number }) {
  const hidden = tags.slice(max);
  return (
    <>
      {tags.slice(0, max).map((tag) => (
        <TagPill key={tag.id} tag={tag} />
      ))}
      {hidden.length > 0 && (
        <span className="tag-pill tag-pill--more" title={hidden.map(tagLabel).join(', ')}>
          +{hidden.length}
        </span>
      )}
    </>
  );
}

interface HotspotTagMarksProps {
  tags: Tag[];
  /** Priority and accuracy with their names. */
  labelled?: boolean;
  /** Larger marks, for the hotspot viewer's header. */
  strong?: boolean;
}

/** A hotspot's tags: priority and accuracy as marks first, then its own tags as pills. */
export default function HotspotTagMarks({ tags, labelled = false, strong = false }: HotspotTagMarksProps) {
  const { data: allTags = [] } = useTags();
  const verdicts = TAG_DIMENSIONS.flatMap((dimension) => tags.filter((tag) => tag.dimension === dimension.value));
  const custom = tags.filter((tag) => tag.dimension === null);
  if (tags.length === 0) return null;

  return (
    <span className={`tag-marks${strong ? ' tag-marks--strong' : ''}`}>
      {verdicts.map((tag) => (
        <VerdictMark key={tag.id} tag={tag} allTags={allTags} labelled={labelled} size={strong ? 18 : 16} />
      ))}
      {custom.map((tag) => (
        <TagPill key={tag.id} tag={tag} />
      ))}
    </span>
  );
}
