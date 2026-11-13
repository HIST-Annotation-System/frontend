import { ArrowDown, ArrowUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getThumbnailUrl } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import { formatBytes, formatDateTime, formatRelativeDate } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useSlideProgress } from '../hooks/useSlideProgress';
import type { SlideSort, SlideSortKey } from '../utils/slideSort';
import SlideStatusBadge from './SlideStatusBadge';
import './SlideLibrary.css';

interface SlideTableProps {
  /** Already in the chosen order. */
  slides: Slide[];
  sort: SlideSort;
  onSortChange: (sort: SlideSort) => void;
  selectedId: string | null;
  onSelect: (slideId: string) => void;
}

/**
 * The library as a table: the name of a ready slide opens it; a click elsewhere selects the slide for the preview
 * panel, a double click (or Enter) opens it.
 */
export default function SlideTable({ slides, sort: chosenSort, onSortChange, selectedId, onSelect }: SlideTableProps) {
  // The server's order is newest first: shown as "Dodano" descending.
  const sort: NonNullable<SlideSort> = chosenSort ?? { key: 'created_at', descending: true };
  const navigate = useNavigate();
  // All slides ready: the column would only repeat one word.
  const showStatus = slides.some((slide) => slide.status !== 'ready');
  const progressOf = useSlideProgress();

  const open = (slide: Slide) => {
    if (slide.status === 'ready') navigate(`/slides/${slide.id}`);
  };

  const sortHeader = (key: SlideSortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.descending ? 'descending' : 'ascending') : undefined}>
      <button
        type="button"
        className={`slide-table__sort${sort.key === key ? ' slide-table__sort--active' : ''}`}
        onClick={() => onSortChange({ key, descending: sort.key === key ? !sort.descending : false })}
      >
        {label}
        {sort.key === key &&
          (sort.descending ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />)}
      </button>
    </th>
  );

  return (
    <table className="slide-table">
      <thead>
        <tr>
          <th className="slide-table__thumb-head">
            <span className="visually-hidden">Miniatura</span>
          </th>
          {sortHeader('name', 'Nazwa')}
          <th className="slide-table__number">Pow.</th>
          <th className="slide-table__number">Rozmiar</th>
          <th>Dodał</th>
          {sortHeader('created_at', 'Dodano')}
          {showStatus && <th>Stan</th>}
        </tr>
      </thead>
      <tbody>
        {slides.map((slide) => {
          const magnification = getNativeMagnification(slide);
          const progress = progressOf(slide);
          const selected = slide.id === selectedId;
          return (
            <tr
              key={slide.id}
              tabIndex={0}
              aria-selected={selected}
              className={selected ? 'slide-table__row--selected' : undefined}
              onClick={() => onSelect(slide.id)}
              onDoubleClick={() => open(slide)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (selected) open(slide);
                  else onSelect(slide.id);
                }
              }}
            >
              <td className="slide-table__thumb-cell">
                {slide.status === 'ready' ? (
                  <img className="slide-table__thumb" src={getThumbnailUrl(slide.id)} alt="" loading="lazy" />
                ) : (
                  <span className="slide-table__thumb slide-table__thumb--empty" aria-hidden="true" />
                )}
              </td>
              <td className="slide-table__name" title={slide.name}>
                {slide.status === 'ready' ? (
                  <Link
                    to={`/slides/${slide.id}`}
                    className="slide-table__name-link"
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    {slide.name}
                  </Link>
                ) : (
                  slide.name
                )}
              </td>
              <td className="slide-table__number">{magnification ? `${magnification}×` : '—'}</td>
              <td className="slide-table__number">
                {slide.file_size_bytes !== null ? formatBytes(slide.file_size_bytes) : '—'}
              </td>
              <td className="slide-table__muted" title={slide.uploaded_by ?? undefined}>
                {slide.uploaded_by ?? '—'}
              </td>
              <td className="slide-table__date" title={formatDateTime(slide.created_at)}>
                {formatRelativeDate(slide.created_at)}
              </td>
              {showStatus && (
                <td className="slide-table__status">
                  {slide.status !== 'ready' && <SlideStatusBadge status={slide.status} />}
                  {progress !== null && <span className="slide-table__progress"> {progress}%</span>}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
