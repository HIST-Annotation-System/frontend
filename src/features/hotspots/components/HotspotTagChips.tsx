import Badge from '../../../components/ui/Badge';
import type { Hotspot } from '../../../types/hotspot';
import { tagLabel } from '../utils/hotspotTags';
import './Hotspots.css';

/** The hotspot's tags as compact pills. */
export default function HotspotTagChips({ hotspot }: { hotspot: Hotspot }) {
  if (hotspot.tags.length === 0) return null;

  return (
    <div className="hotspot-pills">
      {hotspot.tags.map((tag) => (
        <span key={tag.id} title={tagLabel(tag)}>
          <Badge>{tag.name}</Badge>
        </span>
      ))}
    </div>
  );
}
