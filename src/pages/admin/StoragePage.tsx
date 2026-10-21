import StorageBrowser from '../../features/storage/components/StorageBrowser';

export default function StoragePage() {
  return (
    <>
      <div className="page-strip">
        <h1 className="page-strip__title">Magazyn</h1>
      </div>
      <div className="admin-page__body admin-page__body--wide">
        <StorageBrowser />
      </div>
    </>
  );
}
