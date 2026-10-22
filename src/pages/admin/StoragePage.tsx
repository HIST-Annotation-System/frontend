import StorageBrowser from '../../features/storage/components/StorageBrowser';
import './StoragePage.css';

export default function StoragePage() {
  return (
    <div className="admin-page storage-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Magazyn</h1>
      </div>
      <div className="storage-page__body">
        <StorageBrowser />
      </div>
    </div>
  );
}
