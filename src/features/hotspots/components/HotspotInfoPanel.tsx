import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnnotationOwner } from '../../../types/annotation';
import type { Hotspot } from '../../../types/hotspot';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import ExportAnnotationsButton from '../../annotations/components/ExportAnnotationsButton';
import { formatSquareSize } from '../utils/hotspotFormat';
import HotspotSource from './HotspotSource';
import '../../viewer/components/SlideInfoPanel.css';
import './Hotspots.css';

interface HotspotInfoPanelProps {
  hotspot: Hotspot;
  folderName: string | undefined;
  onError: (message: string) => void;
}

/** Bottom of the hotspot viewer's panel: the hotspot's parameters (rolled up by default) and the annotation export. */
export default function HotspotInfoPanel({ hotspot, folderName, onError }: HotspotInfoPanelProps) {
  const [open, setOpen] = useState(false);
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };
  const rows: [label: string, value: string][] = [
    ['Wymiary', `${formatDimensions(hotspot.image_width, hotspot.image_height)} · ${hotspot.image_type.toUpperCase()}`],
    ...(hotspot.x !== null && hotspot.y !== null && hotspot.size !== null
      ? ([
          ['Pozycja (L0)', `x ${hotspot.x.toLocaleString('pl-PL')} · y ${hotspot.y.toLocaleString('pl-PL')}`],
          ['Obszar (L0)', formatSquareSize(hotspot.size, null)],
        ] satisfies [string, string][])
      : []),
    ['Rozdzielczość', hotspot.mpp ? `${hotspot.mpp.toFixed(4)} µm/px` : '—'],
    ['Utworzono', formatDateTime(hotspot.created_at)],
  ];

  return (
    <section className="hotspot-info">
      <button
        type="button"
        className="hotspot-info__toggle"
        aria-expanded={open}
        aria-controls="hotspot-info-list"
        onClick={() => setOpen(!open)}
      >
        <span className="label-caps">Hotspot</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <dl id="hotspot-info-list" className="slide-info__list hotspot-info__list">
          <div className="slide-info__row">
            <dt>Nazwa</dt>
            <dd title={hotspot.name}>{hotspot.name}</dd>
          </div>
          <div className="slide-info__row">
            <dt>Folder</dt>
            <dd className="slide-info__text" title={folderName}>
              <Link to={`/hotspots?folder=${hotspot.folder_id}`}>{folderName ?? '—'}</Link>
            </dd>
          </div>
          <div className="slide-info__row">
            <dt>Źródło</dt>
            <dd className="slide-info__text" title={hotspot.slide_name ?? undefined}>
              <HotspotSource hotspot={hotspot} />
            </dd>
          </div>
          {rows.map(([label, value]) => (
            <div key={label} className="slide-info__row">
              <dt>{label}</dt>
              <dd title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ExportAnnotationsButton owner={owner} name={hotspot.name} onError={onError} label="Eksportuj anotacje (zgodny z QuPath)" />
    </section>
  );
}
