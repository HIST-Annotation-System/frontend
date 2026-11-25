import { pageNumbers } from '../utils/pagination';
import './Hotspots.css';

interface HotspotPagerProps {
  page: number;
  pageCount: number;
  /** Shown on the right as "1–24 z 216". */
  start: number;
  end: number;
  total: number;
  onChange: (page: number) => void;
}

/** Pages of the catalog list (cards or table): "< 1 2 3 … 9 >" and the range shown; hidden when everything fits on one page. */
export default function HotspotPager({ page, pageCount, start, end, total, onChange }: HotspotPagerProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className="hotspot-pager" aria-label="Strony">
      <button
        type="button"
        className="hotspot-pager__step"
        title="Poprzednia strona"
        aria-label="Poprzednia strona"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        &lt;
      </button>
      {pageNumbers(page, pageCount).map((number, index) =>
        number === null ? (
          <span key={`gap-${index}`} className="hotspot-pager__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={number}
            type="button"
            className={`hotspot-pager__page${number === page ? ' hotspot-pager__page--current' : ''}`}
            aria-current={number === page ? 'page' : undefined}
            aria-label={`Strona ${number}`}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ),
      )}
      <button
        type="button"
        className="hotspot-pager__step"
        title="Następna strona"
        aria-label="Następna strona"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        &gt;
      </button>
      <span className="hotspot-pager__range">
        {start + 1}–{end} z {total}
      </span>
    </nav>
  );
}
