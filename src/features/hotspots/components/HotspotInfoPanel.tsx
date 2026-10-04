import { Link } from 'react-router-dom';
import type { Hotspot } from '../../../types/hotspot';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import { formatSquareSize } from '../utils/hotspotFormat';
import HotspotSource from './HotspotSource';
import '../../viewer/components/SlideInfoPanel.css';

interface HotspotInfoPanelProps {
  hotspot: Hotspot;
  folderName: string | undefined;
}

export default function HotspotInfoPanel({ hotspot, folderName }: HotspotInfoPanelProps) {
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
    <div className="slide-info">
      <dl className="slide-info__list">
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
    </div>
  );
}
