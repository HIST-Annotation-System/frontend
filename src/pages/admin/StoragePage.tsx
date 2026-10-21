import StorageBrowser from '../../features/storage/components/StorageBrowser';
import './StoragePage.css';

export default function StoragePage() {
  return (
    <div className="admin-page storage-page">
      <div className="admin-page-header">
        <div className="admin-page-header__text">
          <h1 className="page-title">Zarządzanie plikami</h1>
        </div>
      </div>
      <StorageBrowser />
    </div>
  );
}
