import { CircleAlert } from 'lucide-react';
import { MIN_RATINGS } from '../utils/hotspotReview';

export default function RatingCount({ count }: { count: number }) {
  const few = count < MIN_RATINGS;
  return (
    <span className={`rating-count${few ? ' rating-count--few' : ''}`}>
      {few && <CircleAlert size={13} aria-hidden="true" />}
      {count}
      {few && <span className="visually-hidden">, mniej niż {MIN_RATINGS}</span>}
    </span>
  );
}
