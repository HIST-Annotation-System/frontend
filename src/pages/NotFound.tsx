import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Nie znaleziono</h1>
      <Link to="/">Wróć do biblioteki slajdów</Link>
    </div>
  );
}
