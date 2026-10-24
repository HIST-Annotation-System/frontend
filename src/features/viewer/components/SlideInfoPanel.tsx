import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import SidebarSection from '../../../components/ui/SidebarSection';
import type { SlideDetail } from '../../../types/slide';
import { useHotspotFolders, useSlideHotspots } from '../../hotspots/hooks/useHotspots';
import SlideFacts from '../../slides/components/SlideFacts';
import './SlideInfoPanel.css';

interface SlideInfoPanelProps {
  slide: SlideDetail;
}

/** The slide viewer's right-hand panel: the slide's parameters, and its hotspots by folder. */
export default function SlideInfoPanel({ slide }: SlideInfoPanelProps) {
  const { data: hotspots = [] } = useSlideHotspots(slide.id);
  const { data: folders = [] } = useHotspotFolders();

  const perFolder = new Map<string, number>();
  hotspots.forEach((hotspot) => perFolder.set(hotspot.folder_id, (perFolder.get(hotspot.folder_id) ?? 0) + 1));

  return (
    <aside className="side-pane" aria-label="Informacje o slajdzie">
      <SidebarSection title="Informacje o slajdzie">
        <SlideFacts slide={slide} />
      </SidebarSection>
      <SidebarSection title="Hotspoty na slajdzie" meta={hotspots.length}>
        {perFolder.size === 0 ? (
          <p className="slide-info__empty">Brak hotspotów.</p>
        ) : (
          <dl className="kv">
            {[...perFolder].map(([folderId, count]) => (
              <Fragment key={folderId}>
                <dt>
                  <Link className="slide-info__folder" to={`/hotspots?folder=${folderId}`}>
                    {folders.find((folder) => folder.id === folderId)?.name ?? '…'}
                  </Link>
                </dt>
                <dd>{count}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </SidebarSection>
    </aside>
  );
}
