import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { getErrorMessage } from '../../../utils/errors';
import { useSlides } from '../hooks/useSlides';
import SlideCard from './SlideCard';
import './SlideList.css';

export default function SlideList() {
  const { data, isPending, isError, error } = useSlides();

  if (isPending) return <Spinner label="Wczytywanie slajdów…" />;
  if (isError) return <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać listy slajdów.')} />;
  if (data.length === 0) {
    return <p className="slide-list__empty">Brak slajdów. Wgraj pierwszy plik powyżej.</p>;
  }

  return (
    <ul className="slide-list">
      {data.map((slide) => (
        <li key={slide.id}>
          <SlideCard slide={slide} />
        </li>
      ))}
    </ul>
  );
}
