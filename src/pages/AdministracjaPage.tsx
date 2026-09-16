import StorageBrowser from '../features/storage/components/StorageBrowser';
import './AdministracjaPage.css';

export default function AdministracjaPage() {
  return (
    <div className="administracja-page">
      <div className="administracja-page__inner">
        <h1 className="administracja-page__title">Administracja</h1>
        <StorageBrowser />
      </div>
    </div>
  );
}
