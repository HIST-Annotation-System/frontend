import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { SlideDetail } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import './SlideInfoPanel.css';

interface SlideInfoPanelProps {
  slide: SlideDetail;
}

/** The slide's parameters, floating in the viewer's bottom-left corner; the list unrolls upwards. */
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
    <div className="slide-info slide-info--floating">
      {open && (
        <dl id="slide-info-list" className="slide-info__list">
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
        aria-controls="slide-info-list"
        onClick={() => setOpen(!open)}
      >
        Parametry slajdu
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
