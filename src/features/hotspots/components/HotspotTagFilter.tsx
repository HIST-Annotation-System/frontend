import { ChevronDown, Tags } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import type { Tag } from '../../../types/tag';
import { useTags } from '../hooks/useTags';
import { customTags, dimensionTags, TAG_DIMENSIONS, tagTone } from '../utils/hotspotTags';
import './Hotspots.css';

interface HotspotTagFilterProps {
  tagIds: number[];
  onChange: (tagIds: number[]) => void;
}

/**
 * A dropdown of every tag with ticks; hotspots must carry all ticked tags. A hotspot has one importance and one
 * accuracy, so ticking a value of those unticks the other values of its group.
 */
export default function HotspotTagFilter({ tagIds, onChange }: HotspotTagFilterProps) {
  const { data: tags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggle = (tag: Tag) => {
    if (tagIds.includes(tag.id)) {
      onChange(tagIds.filter((id) => id !== tag.id));
      return;
    }
    const sameGroup = tag.dimension ? dimensionTags(tags, tag.dimension).map((item) => item.id) : [];
    onChange([...tagIds.filter((id) => !sameGroup.includes(id)), tag.id]);
  };

  const groups = [
    ...TAG_DIMENSIONS.map((dimension) => ({ label: dimension.label, tags: dimensionTags(tags, dimension.value) })),
    { label: 'Tagi', tags: customTags(tags) },
  ].filter((group) => group.tags.length > 0);

  return (
    <div className="hotspot-tag-filter" ref={root}>
      <Button
        className="hotspot-tag-filter__toggle"
        active={tagIds.length > 0}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <Tags size={14} className="hotspot-tag-filter__icon" aria-hidden="true" />
        Filtr tagów
        {tagIds.length > 0 && <span className="hotspot-tag-filter__count">{tagIds.length}</span>}
        <ChevronDown size={14} className="hotspot-tag-filter__icon" aria-hidden="true" />
      </Button>
      {open && (
        <div className="hotspot-tag-filter__menu" role="group" aria-label="Filtr tagów">
          {groups.map((group) => (
            <fieldset key={group.label} className="hotspot-tag-filter__group">
              <legend className="hotspot-tag-panel__label">{group.label}</legend>
              {group.tags.map((tag) => (
                <label key={tag.id} className="hotspot-tag-filter__option">
                  <input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => toggle(tag)} />
                  <span className="hotspot-pills">
                    <Badge tone={tagTone(tag, tags)}>{tag.name}</Badge>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
          <Button
            variant="ghost"
            className="hotspot-tag-filter__clear"
            disabled={tagIds.length === 0}
            onClick={() => onChange([])}
          >
            Wyczyść filtr
          </Button>
        </div>
      )}
    </div>
  );
}
