import { File } from 'lucide-react';
import type { StorageObject } from '../../../types/storage';
import { formatBytes, formatDateTime } from '../../../utils/format';
import { fileKind } from './storageLabels';

interface StorageFileCellsProps {
  object: StorageObject;
  name: string;
}

/** The name, size, date and type cells of a file row in `StorageExplorer`. */
export default function StorageFileCells({ object, name }: StorageFileCellsProps) {
  return (
    <>
      <span className="storage-item__main">
        <File size={14} aria-hidden="true" />
        <span className="storage-item__name" title={name}>{name}</span>
      </span>
      <span className="storage-item__meta storage-item__size">{formatBytes(object.size)}</span>
      <span className="storage-item__meta">{formatDateTime(object.last_modified)}</span>
      <span className="storage-item__kind">{fileKind(name)}</span>
    </>
  );
}
