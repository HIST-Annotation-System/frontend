import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { AnnotationOwner } from '../../../types/annotation';
import type { Hotspot } from '../../../types/hotspot';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import ExportAnnotationsButton from '../../annotations/components/ExportAnnotationsButton';
import { formatSquareSize } from '../utils/hotspotFormat';
import HotspotSource from './HotspotSource';

interface HotspotInfoProps {
  hotspot: Hotspot;
  folderName: string | undefined;
  onError: (message: string) => void;
}

/** The hotspot's parameters and the annotation export (viewer inspector). */
export default function HotspotInfo({ hotspot, folderName, onError }: HotspotInfoProps) {
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };
  const rows: [label: string, value: string][] = [
    ...(hotspot.x !== null && hotspot.y !== null && hotspot.size !== null
      ? ([
          ['Pozycja L0', `${hotspot.x.toLocaleString('pl-PL')}, ${hotspot.y.toLocaleString('pl-PL')}`],
          ['Obszar L0', formatSquareSize(hotspot.size, null)],
        ] satisfies [string, string][])
      : []),
    ['Obraz', `${formatDimensions(hotspot.image_width, hotspot.image_height)} · ${hotspot.image_type.toUpperCase()}`],
    ['MPP', hotspot.mpp ? `${hotspot.mpp.toFixed(4)} µm/px` : '—'],
    ['Utworzono', formatDateTime(hotspot.created_at)],
  ];

  return (
    <>
      <dl className="kv">
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
      <div>
        <ExportAnnotationsButton owner={owner} name={hotspot.name} onError={onError} />
      </div>
    </>
  );
}
