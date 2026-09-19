import StorageBrowser from '../../features/storage/components/StorageBrowser';
import './StoragePage.css';

export default function StoragePage() {
  return (
    <div className="storage-page">
      <div className="storage-page__inner">
        <h1 className="storage-page__title">Administracja</h1>
        <StorageBrowser />
      </div>
    </div>
  );
}
