import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found__box">
        <span className="not-found__code mono-data">404</span>
        <h1 className="not-found__title">Nie znaleziono strony</h1>
        <p className="not-found__text">Ta strona nie istnieje lub została przeniesiona.</p>
        <Link to="/" className="btn">
          Wróć do biblioteki slajdów
        </Link>
      </div>
    </div>
  );
}
