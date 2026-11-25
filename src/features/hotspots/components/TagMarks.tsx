import { CircleCheck, CircleX } from 'lucide-react';
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

const PRIORITY_PIPS: Record<PriorityLevel, number> = { high: 3, medium: 2, low: 1 };

/** A priority as three pips, like a rating: all filled for high, two for medium, one for low. */
function PriorityPips({ level, size }: { level: PriorityLevel; size: number }) {
  const pip = Math.round(size / 3);
  return (
    <span className="priority-pips" aria-hidden="true">
      {[1, 2, 3].map((index) => (
        <span
          key={index}
          className={`priority-pips__pip${index <= PRIORITY_PIPS[level] ? ' priority-pips__pip--on' : ''}`}
          style={{ width: pip, height: pip }}
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

/** A priority as three pips (high, medium, low) or an accuracy as a circled tick (correct) or cross (wrong). */
export function VerdictMark({ tag, allTags, labelled = false, size = 16 }: VerdictMarkProps) {
  const wrong = isWrongAccuracy(tag);
  const level = priorityLevel(tag, allTags);
  const accuracy = tag.dimension === 'accuracy';
  const variant = accuracy ? (wrong ? 'wrong' : 'correct') : `priority-${level}`;
  const Icon = wrong ? CircleX : CircleCheck;

  return (
    <span className={`tag-mark tag-mark--${variant}`} title={labelled ? undefined : tagLabel(tag)}>
      {accuracy ? <Icon size={size} strokeWidth={1.75} aria-hidden="true" /> : <PriorityPips level={level} size={size} />}
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
