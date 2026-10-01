import { useState } from 'react';
import type { SlideDetail } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import './SlideInfoPanel.css';

interface SlideInfoPanelProps {
  slide: SlideDetail;
}

export default function SlideInfoPanel({ slide }: SlideInfoPanelProps) {
  const magnification = getNativeMagnification(slide);
  const [open, setOpen] = useState(false);
  const rows: [label: string, value: string][] = [
    ['Plik', slide.original_filename],
    ['Format', slide.vendor ?? '—'],
    ['Rozmiar (L0)', formatDimensions(slide.width, slide.height)],
    ['Poziomy piramidy', slide.level_count?.toString() ?? '—'],
    ['Powiększenie', magnification ? `${magnification}×${slide.objective_power ? '' : ' (szacowane)'}` : '—'],
    ['Rozdzielczość', slide.mpp_x ? `${slide.mpp_x.toFixed(4)} µm/px` : '—'],
    ['Rozmiar pliku', slide.file_size_bytes ? formatBytes(slide.file_size_bytes) : '—'],
    ['Dodano', formatDateTime(slide.created_at)],
  ];

  return (
    <div className="slide-info">
      <details className="slide-info__properties" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Parametry slajdu ({rows.length})</summary>
        <dl className="slide-info__list">
          {rows.map(([label, value]) => (
            <div key={label} className="slide-info__row">
              <dt>{label}</dt>
              <dd title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
