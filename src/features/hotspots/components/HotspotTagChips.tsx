import Badge from '../../../components/ui/Badge';
import type { Hotspot } from '../../../types/hotspot';
import { useTags } from '../hooks/useTags';
import { tagLabel, tagTone } from '../utils/hotspotTags';
import './Hotspots.css';

/** The hotspot's tags as compact pills (whether it was reannotated is shown on the card's thumbnail). */
export default function HotspotTagChips({ hotspot }: { hotspot: Hotspot }) {
  const { data: allTags = [] } = useTags();
  if (hotspot.tags.length === 0) return null;

  return (
    <div className="hotspot-pills">
      {hotspot.tags.map((tag) => (
        <span key={tag.id} title={tagLabel(tag)}>
          <Badge tone={tagTone(tag, allTags)}>{tag.name}</Badge>
        </span>
      ))}
    </div>
  );
}
