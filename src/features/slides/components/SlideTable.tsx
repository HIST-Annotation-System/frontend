import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Slide } from '../../../types/slide';
import { formatDateTime } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useSlideProgress } from '../hooks/useSlideProgress';
import './SlideTable.css';

type SortKey = 'name' | 'created_at';

interface SlideTableProps {
  slides: Slide[];
  selectedId: string | null;
  onSelect: (slideId: string) => void;
}

const STATUS_TEXT: Record<Slide['status'], string> = {
  uploading: 'wgrywanie',
  processing: 'przetwarzanie',
  ready: 'gotowy',
  failed: 'błąd',
};

export function SlideStatus({ slide, progress }: { slide: Slide; progress: number | null }) {
  const text = STATUS_TEXT[slide.status];
  if (slide.status === 'failed') return <span className="text-error">{text}</span>;
  if (slide.status === 'ready') return <span className="data-table__muted">{text}</span>;
  return (
    <span>
      {text}
      {progress !== null && <span className="mono-data"> {progress}%</span>}
    </span>
  );
}

const formatDimensions = (slide: Slide) =>
  slide.width && slide.height
    ? `${slide.width.toLocaleString('pl-PL')} × ${slide.height.toLocaleString('pl-PL')}`
    : '—';

/** The library as a dense table; a click selects a slide for the preview pane, a double click opens it. */
export default function SlideTable({ slides, selectedId, onSelect }: SlideTableProps) {
  const navigate = useNavigate();
  const progressOf = useSlideProgress();
  // null: the server's order (newest first).
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean } | null>(null);

  const sorted = sort
    ? [...slides].sort((a, b) => {
        const order = sort.key === 'name' ? a.name.localeCompare(b.name, 'pl') : a.created_at.localeCompare(b.created_at);
        return sort.descending ? -order : order;
      })
    : slides;

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={className} aria-sort={sort?.key === key ? (sort.descending ? 'descending' : 'ascending') : undefined}>
      <button
        type="button"
        className="slide-table__sort"
        onClick={() => setSort({ key, descending: sort?.key === key ? !sort.descending : false })}
      >
        {label}
        {sort?.key === key && (sort.descending ? ' ▼' : ' ▲')}
      </button>
    </th>
  );

  return (
    <table className="data-table slide-table">
      <thead>
        <tr>
          {header('name', 'Nazwa')}
          <th className="data-table__num">Wymiary (px)</th>
          <th>Pow.</th>
          <th>Producent</th>
          <th>Dodał</th>
          {header('created_at', 'Dodano')}
          <th>Stan</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((slide) => {
          const magnification = getNativeMagnification(slide);
          return (
            <tr
              key={slide.id}
              aria-selected={slide.id === selectedId}
              onClick={() => onSelect(slide.id)}
              onDoubleClick={() => slide.status === 'ready' && navigate(`/slides/${slide.id}`)}
            >
              <td className="slide-table__name" title={slide.original_filename}>
                {slide.name}
              </td>
              <td className="data-table__num">{formatDimensions(slide)}</td>
              <td className="mono-data">{magnification ? `${magnification}×` : '—'}</td>
              <td className="data-table__muted">{slide.vendor ?? '—'}</td>
              <td className="data-table__muted">{slide.uploaded_by ?? '—'}</td>
              <td className="mono-data">{formatDateTime(slide.created_at)}</td>
              <td>
                <SlideStatus slide={slide} progress={progressOf(slide)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
