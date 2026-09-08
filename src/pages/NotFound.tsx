import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Nie znaleziono</h1>
      <p>Strona, której szukasz nie istnieje.</p>
      <Link to="/" style={{ color: 'blue', textDecoration: 'underline' }}>Wróć do strony głównej</Link>
    </div>
  );
};

export default NotFound;
