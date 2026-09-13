import { File } from 'lucide-react';
import { useState } from 'react';
import { formatBytes, formatDateTime } from '../../../utils/format';
import type { StorageObject } from '../../../types/storage';
import StorageExplorer from './StorageExplorer';

interface StorageFilePickerProps {
  onSelect: (object: StorageObject) => void;
}

/** Lets the user pick a file already sitting in object storage instead of uploading a new one. */
export default function StorageFilePicker({ onSelect }: StorageFilePickerProps) {
  const [prefix, setPrefix] = useState('');

  return (
    <StorageExplorer
      prefix={prefix}
      onNavigate={setPrefix}
      renderFile={(object, name) => (
        <li key={object.key} className="storage-item">
          <button type="button" className="storage-item__main" onClick={() => onSelect(object)}>
            <File size={16} aria-hidden="true" />
            <span className="storage-item__name">{name}</span>
          </button>
          <span className="storage-item__meta mono-data">{formatBytes(object.size)}</span>
          <span className="storage-item__meta mono-data">{formatDateTime(object.last_modified)}</span>
        </li>
      )}
    />
  );
}
