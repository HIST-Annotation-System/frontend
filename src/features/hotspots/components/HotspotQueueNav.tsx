import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
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

/** Previous/next hotspot of the catalog's filtered and sorted list, and the way back to it. */
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
      <Link className="btn btn--ghost btn--icon-only" to={`/hotspots${search}`} title="Wróć do listy" aria-label="Wróć do listy">
        <LayoutGrid size={16} />
      </Link>
      <QueueLink target={previous} search={search}>
        <ChevronLeft size={16} />
        Poprzedni
      </QueueLink>
      <span className="hotspot-queue__position mono-data">{position}</span>
      <QueueLink target={next} search={search}>
        Następny
        <ChevronRight size={16} />
      </QueueLink>
    </nav>
  );
}

function QueueLink({ target, search, children }: { target: Hotspot | undefined; search: string; children: ReactNode }) {
  if (!target) {
    return (
      <span className="btn btn--default hotspot-queue__disabled" aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link className="btn btn--default" to={`/hotspots/${target.id}${search}`} title={target.name}>
      {children}
    </Link>
  );
}
