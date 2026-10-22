
import { useState } from 'react';
import type { StorageObject } from '../../../types/storage';
import StorageExplorer from './StorageExplorer';
import StorageFileCells from './StorageFileCells';

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
          <button type="button" className="storage-item__row" onClick={() => onSelect(object)}>
            <StorageFileCells object={object} name={name} />
          </button>
        </li>
      )}
    />
  );
}
