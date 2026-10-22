import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { getStorageDownloadUrl } from '../../../services/storageApi';
import { getErrorMessage } from '../../../utils/errors';
import StorageExplorer from './StorageExplorer';
import StorageFileCells from './StorageFileCells';
import './StorageBrowser.css';

const PATH_PARAM = 'path';

export default function StorageBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = searchParams.get(PATH_PARAM) ?? '';
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const navigateTo = (nextPrefix: string) => {
    setSearchParams(nextPrefix ? { [PATH_PARAM]: nextPrefix } : {});
  };

  const openObject = async (key: string) => {
    setDownloadingKey(key);
    setDownloadError(null);
    try {
      const url = await getStorageDownloadUrl(key);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (requestError) {
      setDownloadError(getErrorMessage(requestError, 'Nie udało się wygenerować linku do pliku.'));
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="storage-browser">
      {downloadError && <ErrorMessage message={downloadError} onDismiss={() => setDownloadError(null)} />}
      <StorageExplorer
        prefix={prefix}
        onNavigate={navigateTo}
        renderFile={(object, name) => (
          <li key={object.key} className="storage-item">
            <StorageFileCells object={object} name={name} />
            <span className="storage-item__action">
              <Button
                title={`Pobierz ${name}`}
                disabled={downloadingKey === object.key}
                onClick={() => void openObject(object.key)}
              >
                Pobierz
              </Button>
            </span>
          </li>
        )}
      />
    </div>
  );
}
