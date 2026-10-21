import { Folder } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { getErrorMessage } from '../../../utils/errors';
import { useStorageBrowser } from '../hooks/useStorageBrowser';
import type { StorageObject } from '../../../types/storage';
import './StorageExplorer.css';

/** Object key/prefix relative to the folder currently shown (both end up children of `prefix`). */
const relativeName = (fullKey: string, prefix: string): string => fullKey.slice(prefix.length).replace(/\/$/, '');

interface StorageExplorerProps {
  prefix: string;
  onNavigate: (prefix: string) => void;
  /** Renders one file row (an <li>); folders are always rendered the same way (they just navigate). */
  renderFile: (object: StorageObject, name: string) => ReactNode;
}

/** Breadcrumb + folder/file listing shared by the admin storage browser and the upload file picker. */
export default function StorageExplorer({ prefix, onNavigate, renderFile }: StorageExplorerProps) {
  const { prefixes, objects, hasMore, isLoadingMore, loadMoreError, loadMore, isPending, isError, error } =
    useStorageBrowser(prefix);
  const segments = prefix.split('/').filter(Boolean);

  return (
    <div className="storage-explorer">
      <nav className="storage-breadcrumb" aria-label="Ścieżka w magazynie">
        <button type="button" className="storage-breadcrumb__crumb" onClick={() => onNavigate('')}>
          magazyn
        </button>
        {segments.map((segment, index) => (
          <span key={segment + index.toString()} className="storage-breadcrumb__segment">
            <span className="storage-breadcrumb__sep">/</span>
            <button
              type="button"
              className="storage-breadcrumb__crumb"
              onClick={() => onNavigate(`${segments.slice(0, index + 1).join('/')}/`)}
            >
              {segment}
            </button>
          </span>
        ))}
      </nav>

      {isPending && <Spinner label="Wczytywanie zawartości magazynu…" />}
      {isError && <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać zawartości magazynu.')} />}

      {!isPending && !isError && prefixes.length === 0 && objects.length === 0 && (
        <p className="storage-list__empty">Ten folder jest pusty.</p>
      )}

      {!isPending && !isError && (prefixes.length > 0 || objects.length > 0) && (
        <ul className="storage-list">
          {prefixes.map((folderPrefix) => (
            <li key={folderPrefix} className="storage-item">
              <button type="button" className="storage-item__main" onClick={() => onNavigate(folderPrefix)}>
                <Folder size={16} aria-hidden="true" />
                <span className="storage-item__name">{relativeName(folderPrefix, prefix)}</span>
              </button>
            </li>
          ))}
          {objects.map((object) => renderFile(object, relativeName(object.key, prefix)))}
        </ul>
      )}

      {hasMore && (
        <Button small disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? 'Wczytywanie…' : 'Wczytaj więcej'}
        </Button>
      )}
      {loadMoreError && <ErrorMessage message={loadMoreError} />}
    </div>
  );
}
