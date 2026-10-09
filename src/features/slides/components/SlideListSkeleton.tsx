const PLACEHOLDER_CARDS = 8;

/** Placeholder cards in the library's own grid while the first list loads (no layout jump after). */
export default function SlideListSkeleton() {
  return (
    <ul className="slide-list" aria-busy="true" aria-label="Wczytywanie slajdów…">
      {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
        <li key={index} aria-hidden="true">
          <div className="slide-card slide-card--skeleton">
            <div className="slide-card__thumbnail">
              <span className="skeleton-block skeleton-block--fill" />
            </div>
            <div className="slide-card__body">
              <span className="skeleton-block skeleton-block--title" />
              <span className="skeleton-block skeleton-block--meta" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
