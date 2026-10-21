import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Nie znaleziono strony</h1>
      <p className="text-muted">Adres nie istnieje albo strona została przeniesiona.</p>
      <Link to="/">Wróć do listy slajdów</Link>
    </div>
  );
}
