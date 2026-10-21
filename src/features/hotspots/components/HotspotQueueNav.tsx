import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Hotspot, HotspotListQuery } from '../../../types/hotspot';
import { useHotspots } from '../hooks/useHotspots';
import './Hotspots.css';

interface HotspotQueueNavProps {
  hotspot: Hotspot;
  /** The catalog list the viewer was opened from. */
  query: HotspotListQuery;
  /** The catalog's URL search, kept when moving on. */
  search: string;
}

/** Previous/next hotspot of the catalog's filtered and sorted list, shown in the app header as "‹ 3 / 40 ›". */
export default function HotspotQueueNav({ hotspot, query, search }: HotspotQueueNavProps) {
  const { data = [], isPending } = useHotspots(query);
  const found = data.findIndex((item) => item.id === hotspot.id);
  // A tagged hotspot can leave a filtered list (e.g. the untagged ones): its last place still tells what is next.
  const [lastIndex, setLastIndex] = useState(found);
  if (found >= 0 && found !== lastIndex) setLastIndex(found);
  const index = found >= 0 ? found : lastIndex;
  const previous = index > 0 ? data[index - 1] : undefined;
  const next = index >= 0 ? data[found >= 0 ? index + 1 : index] : undefined;
  const position = isPending ? '…' : `${found >= 0 ? found + 1 : '–'} / ${data.length}`;

  return (
    <nav className="hotspot-queue" aria-label="Kolejka hotspotów">
      <QueueLink target={previous} search={search} label="Poprzedni hotspot">
        ‹
      </QueueLink>
      <span className="hotspot-queue__position mono-data">{position}</span>
      <QueueLink target={next} search={search} label="Następny hotspot">
        ›
      </QueueLink>
    </nav>
  );
}

interface QueueLinkProps {
  target: Hotspot | undefined;
  search: string;
  label: string;
  children: ReactNode;
}

function QueueLink({ target, search, label, children }: QueueLinkProps) {
  if (!target) {
    return (
      <span className="hotspot-queue__step hotspot-queue__step--disabled" aria-label={label} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link className="hotspot-queue__step" to={`/hotspots/${target.id}${search}`} aria-label={label} title={target.name}>
      {children}
    </Link>
  );
}
