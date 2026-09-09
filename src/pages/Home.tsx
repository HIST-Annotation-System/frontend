import React from 'react';
import WsiUploader from '../features/upload/components/WsiUploader';

const Home: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Witaj w aplikacji frontendowej</h1>
      <p>Poniżej znajduje się komponent testowy do wieloczęściowego przesyłania plików WSI.</p>
      <WsiUploader />
    </div>
  );
};

export default Home;
