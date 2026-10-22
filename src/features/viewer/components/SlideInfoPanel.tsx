import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import SidebarSection from '../../../components/ui/SidebarSection';
import type { SlideDetail } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDecimal, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useHotspotFolders, useSlideHotspots } from '../../hotspots/hooks/useHotspots';
import './SlideInfoPanel.css';

interface SlideInfoPanelProps {
  slide: SlideDetail;
}

/** The slide viewer's right-hand panel: the slide's parameters, and its hotspots by folder. */
export default function SlideInfoPanel({ slide }: SlideInfoPanelProps) {
  const magnification = getNativeMagnification(slide);
  const { data: hotspots = [] } = useSlideHotspots(slide.id);
  const { data: folders = [] } = useHotspotFolders();

  const rows: [label: string, value: string][] = [
    ['Plik', slide.original_filename],
    ['Format', slide.vendor ?? '—'],
    ['Rozmiar pliku', slide.file_size_bytes ? formatBytes(slide.file_size_bytes) : '—'],
    ['Rozdzielczość', slide.mpp_x ? `${formatDecimal(slide.mpp_x, 4)} µm/px` : '—'],
    ['Wymiary (L0)', formatDimensions(slide.width, slide.height)],
    ['Poziomy piramidy', slide.level_count?.toString() ?? '—'],
    ['Powiększenie', magnification ? `${magnification}×${slide.objective_power ? '' : ' (szacowane)'}` : '—'],
    ['Dodano', formatDateTime(slide.created_at)],
    ['Dodał', slide.uploaded_by ?? '—'],
  ];

  const perFolder = new Map<string, number>();
  hotspots.forEach((hotspot) => perFolder.set(hotspot.folder_id, (perFolder.get(hotspot.folder_id) ?? 0) + 1));

  return (
    <aside className="side-pane" aria-label="Informacje o slajdzie">
      <SidebarSection title="Informacje o slajdzie">
        <dl className="kv">
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd title={value}>{value}</dd>
            </Fragment>
          ))}
        </dl>
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
