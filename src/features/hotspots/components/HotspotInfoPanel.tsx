import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { AnnotationOwner } from '../../../types/annotation';
import type { Hotspot } from '../../../types/hotspot';
import { formatDateTime, formatDecimal, formatDimensions } from '../../../utils/format';
import ExportAnnotationsButton from '../../annotations/components/ExportAnnotationsButton';
import { formatSquareSize } from '../utils/hotspotFormat';
import HotspotSource from './HotspotSource';
import './Hotspots.css';

interface HotspotInfoPanelProps {
  hotspot: Hotspot;
  folderName: string | undefined;
  onError: (message: string) => void;
}

/** Body of the hotspot viewer's "Parametry" section: the hotspot's parameters and the annotation export. */
export default function HotspotInfoPanel({ hotspot, folderName, onError }: HotspotInfoPanelProps) {
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };
  const rows: [label: string, value: string][] = [
    ['Obraz', `${formatDimensions(hotspot.image_width, hotspot.image_height)} · ${hotspot.image_type.toUpperCase()}`],
    ...(hotspot.x !== null && hotspot.y !== null && hotspot.size !== null
      ? ([
          ['Pozycja L0', `x ${hotspot.x.toLocaleString('pl-PL')} · y ${hotspot.y.toLocaleString('pl-PL')}`],
          ['Obszar L0', formatSquareSize(hotspot.size, null)],
        ] satisfies [string, string][])
      : []),
    ['MPP', hotspot.mpp ? `${formatDecimal(hotspot.mpp, 4)} µm/px` : '—'],
    ['Dodano', formatDateTime(hotspot.created_at)],
  ];

  return (
    <>
      <dl className="kv">
        <dt>Nazwa</dt>
        <dd title={hotspot.name}>{hotspot.name}</dd>
        <dt>Folder</dt>
        <dd title={folderName}>
          <Link to={`/hotspots?folder=${hotspot.folder_id}`}>{folderName ?? '—'}</Link>
        </dd>
        <dt>Źródło</dt>
        <dd title={hotspot.slide_name ?? undefined}>
          <HotspotSource hotspot={hotspot} />
        </dd>
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd title={value}>{value}</dd>
          </Fragment>
        ))}
      </dl>
      <ExportAnnotationsButton owner={owner} name={hotspot.name} onError={onError} label="Eksportuj GeoJSON" />
    </>
  );
}
