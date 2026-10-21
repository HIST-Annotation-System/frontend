import { Fragment } from 'react';
import type { Slide } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';

/** The slide's parameters as a label/value list (viewer inspector, library preview). */
export default function SlideInfo({ slide }: { slide: Slide }) {
  const magnification = getNativeMagnification(slide);
  const rows: [label: string, value: string][] = [
    ['Plik', slide.original_filename],
    ['Format', slide.vendor ?? '—'],
    ['Rozmiar L0', formatDimensions(slide.width, slide.height)],
    ['Poziomy', slide.level_count?.toString() ?? '—'],
    ['Powiększenie', magnification ? `${magnification}×${slide.objective_power ? '' : ' (szac.)'}` : '—'],
    ['MPP', slide.mpp_x ? `${slide.mpp_x.toFixed(4)} µm/px` : '—'],
    ['Rozmiar pliku', slide.file_size_bytes ? formatBytes(slide.file_size_bytes) : '—'],
    ['Dodano', formatDateTime(slide.created_at)],
  ];

  return (
    <dl className="kv">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd title={value}>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
