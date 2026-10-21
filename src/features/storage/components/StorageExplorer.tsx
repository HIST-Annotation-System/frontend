import { ChevronRight, Cloud, CornerLeftUp, Folder, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { getErrorMessage } from '../../../utils/errors';
import { useStorageBrowser } from '../hooks/useStorageBrowser';
import type { StorageObject } from '../../../types/storage';
import { folderSummary } from './storageLabels';
import './StorageExplorer.css';

/** Object key/prefix relative to the folder currently shown (both end up children of `prefix`). */
const relativeName = (fullKey: string, prefix: string): string => fullKey.slice(prefix.length).replace(/\/$/, '');

interface StorageExplorerProps {
  prefix: string;
  onNavigate: (prefix: string) => void;
  /**
   * Renders one file row (an <li class="storage-item">) with cells: name, size, date, type and optionally an
   * action (`.storage-item__action`); folders are always rendered the same way (they just navigate).
   */
  renderFile: (object: StorageObject, name: string) => ReactNode;
}

/** Breadcrumb + folder/file listing shared by the admin storage browser and the upload file picker. */
export default function StorageExplorer({ prefix, onNavigate, renderFile }: StorageExplorerProps) {
  const { prefixes, objects, hasMore, isLoadingMore, loadMoreError, loadMore, isPending, isError, error } =
    useStorageBrowser(prefix);
  const segments = prefix.split('/').filter(Boolean);
  const parentPrefix = segments.length > 1 ? `${segments.slice(0, -1).join('/')}/` : '';
  const isEmpty = prefixes.length === 0 && objects.length === 0;

  return (
    <div className="storage-explorer">
      <nav className="storage-breadcrumb" aria-label="Ścieżka w magazynie">
        <Cloud size={16} className="storage-breadcrumb__icon" aria-hidden="true" />
        <button type="button" className="storage-breadcrumb__crumb" onClick={() => onNavigate('')}>
          Magazyn
        </button>
        {segments.map((segment, index) => (
          <span key={segment + index.toString()} className="storage-breadcrumb__segment">
            <ChevronRight size={14} className="storage-breadcrumb__sep" aria-hidden="true" />
            <button
              type="button"
              className="storage-breadcrumb__crumb"
              onClick={() => onNavigate(`${segments.slice(0, index + 1).join('/')}/`)}
            >
              {segment}
            </button>
          </span>
        ))}
        {!isPending && !isError && (
          <span className="storage-breadcrumb__summary">
            {folderSummary(prefixes.length, objects.length)}
            {hasMore ? '+' : ''}
          </span>
        )}
      </nav>

      {isPending && <Spinner label="Wczytywanie zawartości magazynu…" />}
      {isError && <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać zawartości magazynu.')} />}

      {!isPending && !isError && (
        <ul className="storage-list">
          <li className="storage-list__head" aria-hidden="true">
            <span>Nazwa</span>
            <span className="storage-list__head-size">Rozmiar</span>
            <span>Zmodyfikowano</span>
            <span>Typ</span>
          </li>
          {segments.length > 0 && (
            <li className="storage-item storage-item--up">
              <button
                type="button"
                className="storage-item__main"
                title="Folder nadrzędny"
                onClick={() => onNavigate(parentPrefix)}
              >
                <CornerLeftUp size={16} className="storage-item__icon" aria-hidden="true" />
                <span className="storage-item__name">..</span>
              </button>
            </li>
          )}
          {prefixes.map((folderPrefix) => (
            <li key={folderPrefix} className="storage-item">
              <button type="button" className="storage-item__main" onClick={() => onNavigate(folderPrefix)}>
                <Folder size={16} className="storage-item__icon storage-item__icon--folder" aria-hidden="true" />
                <span className="storage-item__name">{relativeName(folderPrefix, prefix)}</span>
              </button>
              <span className="storage-item__meta storage-item__size">—</span>
              <span className="storage-item__meta">—</span>
              <span className="storage-item__kind">Folder</span>
            </li>
          ))}
          {objects.map((object) => renderFile(object, relativeName(object.key, prefix)))}
          {isEmpty && (
            <li className="storage-list__empty">
              <span className="storage-list__empty-icon" aria-hidden="true">
                <FolderOpen size={20} />
              </span>
              <span className="storage-list__empty-title">Ten folder jest pusty.</span>
              <span className="storage-list__empty-text">Pliki wgrane do tego miejsca magazynu pojawią się tutaj.</span>
            </li>
          )}
        </ul>
      )}

      {hasMore && (
        <div className="storage-explorer__more">
          <Button disabled={isLoadingMore} onClick={loadMore}>
            {isLoadingMore ? 'Wczytywanie…' : 'Wczytaj więcej'}
          </Button>
        </div>
      )}
      {loadMoreError && <ErrorMessage message={loadMoreError} />}
    </div>
  );
}
