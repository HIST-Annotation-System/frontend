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

/**
 * The viewer's bottom-left corner: the annotation export, and the hotspot's parameters (unrolling upwards, like the
 * slide viewer's).
 */
export default function HotspotInfoPanel({ hotspot, folderName, onError }: HotspotInfoPanelProps) {
  const [open, setOpen] = useState(false);
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };
  const rows: [label: string, value: string][] = [
    ...(hotspot.x !== null && hotspot.y !== null && hotspot.size !== null
      ? ([
          ['Pozycja (L0)', `${hotspot.x.toLocaleString('pl-PL')}, ${hotspot.y.toLocaleString('pl-PL')}`],
          ['Obszar (L0)', formatSquareSize(hotspot.size, null)],
        ] satisfies [string, string][])
      : []),
    ['Obraz', `${formatDimensions(hotspot.image_width, hotspot.image_height)} · ${hotspot.image_type.toUpperCase()}`],
    ['Rozdzielczość', hotspot.mpp ? `${hotspot.mpp.toFixed(4)} µm/px` : '—'],
    ['Utworzono', formatDateTime(hotspot.created_at)],
  ];

  return (
    <div className="hotspot-corner">
      <ExportAnnotationsButton owner={owner} name={hotspot.name} onError={onError} />
      <div className="slide-info slide-info--floating">
        {open && (
          <dl id="hotspot-info-list" className="slide-info__list">
            <div className="slide-info__row">
              <dt>Folder</dt>
              <dd title={folderName}>
                <Link to={`/hotspots?folder=${hotspot.folder_id}`}>{folderName ?? '—'}</Link>
              </dd>
            </div>
            <div className="slide-info__row">
              <dt>Źródło</dt>
              <dd title={hotspot.slide_name ?? undefined}>
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
        <button
          type="button"
          className="slide-info__toggle"
          aria-expanded={open}
          aria-controls="hotspot-info-list"
          onClick={() => setOpen(!open)}
        >
          Parametry hotspotu
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
    </div>
  );
}
