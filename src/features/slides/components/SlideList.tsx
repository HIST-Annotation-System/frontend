import { Microscope } from 'lucide-react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { useAuth } from '../../../context/AuthContext';
import { getErrorMessage } from '../../../utils/errors';
import { useSlides } from '../hooks/useSlides';
import SlideCard from './SlideCard';
import SlideListSkeleton from './SlideListSkeleton';
import './SlideList.css';

export default function SlideList() {
  const { data, isPending, error } = useSlides();
  const { user } = useAuth();

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
        <div className="slide-list__empty">
          <span className="slide-list__empty-icon">
            <Microscope size={22} aria-hidden="true" />
          </span>
          <p className="slide-list__empty-title">Brak slajdów.</p>
          <p className="slide-list__empty-text">
            {user?.role === 'ADMIN'
              ? 'Wgraj pierwszy plik preparatu - po przetworzeniu pojawi się tutaj.'
              : 'Administrator nie dodał jeszcze żadnych preparatów. Gdy się pojawią, zobaczysz je tutaj.'}
          </p>
        </div>
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
