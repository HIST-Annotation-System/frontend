import { Folder, Info, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SlideDetail } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useHotspotFolders, useSlideHotspots } from '../../hotspots/hooks/useHotspots';
import './SlideInfoPanel.css';

interface SlideInfoPanelProps {
  slide: SlideDetail;
}

/** The slide viewer's right-hand panel: the slide's parameters, and its hotspots by folder. */
export default function SlideInfoPanel({ slide }: SlideInfoPanelProps) {
  const magnification = getNativeMagnification(slide);
  const [open, setOpen] = useState(true);
  const { data: hotspots = [] } = useSlideHotspots(slide.id);
  const { data: folders = [] } = useHotspotFolders();

  const rows: [label: string, value: string, mono: boolean][] = [
    ['Plik', slide.original_filename, true],
    ['Format', slide.vendor ?? '—', false],
    ['Rozmiar pliku', slide.file_size_bytes ? formatBytes(slide.file_size_bytes) : '—', true],
    ['Rozdzielczość', slide.mpp_x ? `${slide.mpp_x.toFixed(4)} µm/px` : '—', true],
    ['Rozmiar (L0)', formatDimensions(slide.width, slide.height), true],
    ['Poziomy piramidy', slide.level_count?.toString() ?? '—', true],
    ['Powiększenie', magnification ? `${magnification}×${slide.objective_power ? '' : ' (szacowane)'}` : '—', true],
    ['Dodano', formatDateTime(slide.created_at), true],
    ['Wgrał', slide.uploaded_by ?? '—', false],
  ];

  const perFolder = new Map<string, number>();
  hotspots.forEach((hotspot) => perFolder.set(hotspot.folder_id, (perFolder.get(hotspot.folder_id) ?? 0) + 1));

  if (!open) {
    return (
      <aside className="viewer-panel viewer-panel--slide viewer-panel--collapsed" aria-label="Informacje o slajdzie">
        <button
          type="button"
          className="viewer-panel__icon-btn"
          title="Pokaż informacje"
          aria-label="Pokaż informacje o slajdzie"
          onClick={() => setOpen(true)}
        >
          <PanelRightOpen size={16} />
        </button>
        <button
          type="button"
          className="viewer-panel__icon-btn slide-info__rail-info"
          title="Informacje"
          aria-label="Informacje o slajdzie"
          onClick={() => setOpen(true)}
        >
          <Info size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="viewer-panel viewer-panel--slide" aria-label="Informacje o slajdzie">
      <div className="viewer-panel__head">
        <span className="label-caps">Informacje o slajdzie</span>
        <button
          type="button"
          className="viewer-panel__icon-btn"
          title="Zwiń panel"
          aria-label="Zwiń panel informacji"
          onClick={() => setOpen(false)}
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="slide-info">
        <dl className="slide-info__list">
          {rows.map(([label, value, mono]) => (
            <div key={label} className="slide-info__row">
              <dt>{label}</dt>
              <dd className={mono ? undefined : 'slide-info__text'} title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <section className="slide-info__group">
          <h3 className="label-caps">Hotspoty na slajdzie</h3>
          {perFolder.size === 0 ? (
            <p className="slide-info__empty">Brak hotspotów. Użyj „Zaznacz hotspoty”.</p>
          ) : (
            [...perFolder].map(([folderId, count]) => (
              <Link key={folderId} className="slide-info__folder" to={`/hotspots?folder=${folderId}`}>
                <Folder size={14} aria-hidden="true" />
                <span className="slide-info__folder-name">
                  {folders.find((folder) => folder.id === folderId)?.name ?? '…'}
                </span>
                <span className="slide-info__folder-count">{count}</span>
              </Link>
            ))
          )}
        </section>
      </div>
    </aside>
  );
}
