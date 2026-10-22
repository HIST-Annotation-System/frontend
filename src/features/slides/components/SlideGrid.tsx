import type { KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getThumbnailUrl } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import { formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useSlideProgress } from '../hooks/useSlideProgress';
import SlideStatusBadge from './SlideStatusBadge';
import './SlideLibrary.css';

interface SlideGridProps {
  /** Already in the chosen order. */
  slides: Slide[];
  selectedId: string | null;
  onSelect: (slideId: string) => void;
}

/** Columns of the grid as laid out now (auto-fill), for moving up and down with the arrows. */
const columnCount = (grid: HTMLElement | null): number =>
  grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 1;

/**
 * The library as tiles with the slide's thumbnail: the name of a ready slide opens it; a click elsewhere selects
 * the slide for the preview panel, a double click (or Enter) opens it, the arrows move between tiles.
 */
export default function SlideGrid({ slides, selectedId, onSelect }: SlideGridProps) {
  const navigate = useNavigate();
  const progressOf = useSlideProgress();

  const open = (slide: Slide) => {
    if (slide.status === 'ready') navigate(`/slides/${slide.id}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.target !== event.currentTarget) return;
    const slide = slides[index];
    if (event.key === 'Enter') {
      if (slide.id === selectedId) open(slide);
      else onSelect(slide.id);
      return;
    }
    const columns = columnCount(event.currentTarget.parentElement?.parentElement ?? null);
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
    if (step === undefined) return;
    const next = index + step;
    if (next < 0 || next >= slides.length) return;
    event.preventDefault();
    onSelect(slides[next].id);
    const tiles = event.currentTarget.parentElement?.parentElement?.querySelectorAll<HTMLElement>('.slide-tile');
    tiles?.[next]?.focus();
  };

  return (
    <ul className="slide-grid">
      {slides.map((slide, index) => {
        const magnification = getNativeMagnification(slide);
        const progress = progressOf(slide);
        const selected = slide.id === selectedId;
        const ready = slide.status === 'ready';
        return (
          <li key={slide.id}>
            <div
              className={`slide-tile${selected ? ' slide-tile--selected' : ''}`}
              tabIndex={0}
              aria-selected={selected}
              title={ready ? 'Dwuklik otwiera slajd' : undefined}
              onClick={(event) => {
                if (!(event.target as Element).closest('a')) onSelect(slide.id);
              }}
              onDoubleClick={() => open(slide)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span className="slide-tile__image">
                {ready && <img src={getThumbnailUrl(slide.id)} alt="" loading="lazy" />}
              </span>
              <span className="slide-tile__name" title={slide.name}>
                {ready ? (
                  <Link to={`/slides/${slide.id}`} onDoubleClick={(event) => event.stopPropagation()}>
                    {slide.name}
                  </Link>
                ) : (
                  slide.name
                )}
              </span>
              <span className="slide-tile__meta">
                {slide.width && slide.height ? `${formatDimensions(slide.width, slide.height)} · ` : ''}
                {magnification ? `${magnification}× · ` : ''}
                <SlideStatusBadge status={slide.status} />
                {progress !== null && ` ${progress}%`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
