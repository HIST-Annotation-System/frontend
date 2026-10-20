import Badge from '../../../components/ui/Badge';
import type { Hotspot } from '../../../types/hotspot';
import { useTags } from '../hooks/useTags';
import { tagLabel, tagTone } from '../utils/hotspotTags';
import './Hotspots.css';

/** The hotspot's tags, and whether it has been reannotated. */
export default function HotspotTagChips({ hotspot }: { hotspot: Hotspot }) {
  const { data: allTags = [] } = useTags();
  if (hotspot.tags.length === 0 && !hotspot.reannotated_at) return null;

  return (
    <div className="hotspot-tags">
      {hotspot.tags.map((tag) => (
        <Badge key={tag.id} tone={tagTone(tag, allTags)}>
          {tagLabel(tag)}
        </Badge>
      ))}
      {hotspot.reannotated_at && <Badge tone="success">Poprawione</Badge>}
    </div>
  );
}
