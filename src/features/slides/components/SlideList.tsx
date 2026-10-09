import ErrorMessage from '../../../components/ui/ErrorMessage';
import { getErrorMessage } from '../../../utils/errors';
import { useSlides } from '../hooks/useSlides';
import SlideCard from './SlideCard';
import SlideListSkeleton from './SlideListSkeleton';
import './SlideList.css';

export default function SlideList() {
  const { data, isPending, error } = useSlides();

  if (isPending) return <SlideListSkeleton />;
  // A failed background refresh keeps the last list on screen; only a failed first load replaces it.
  if (!data) return <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać listy slajdów.')} />;
  const staleNotice = error && (
    <p className="slide-list__stale" role="status">
      Nie udało się odświeżyć listy - pokazano ostatni stan. Ponowna próba za chwilę.
    </p>
  );
  if (data.length === 0) {
    return (
      <>
        {staleNotice}
        <p className="slide-list__empty">Brak slajdów.</p>
      </>
    );
  }

  return (
    <>
      {staleNotice}
      <ul className="slide-list">
        {data.map((slide) => (
          <li key={slide.id}>
            <SlideCard slide={slide} />
          </li>
        ))}
      </ul>
    </>
  );
}
