import type { ResumableUpload } from './resumableUploads';

export type UploadItemStatus = 'queued' | 'uploading' | 'finalizing' | 'completed' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  uploadedBytes: number;
  bytesPerSecond: number | null;
  etaSeconds: number | null;
  message: string;
  slideId: string | null;
  /** Set when the upload can continue where it stopped instead of starting over. */
  resume: ResumableUpload | null;
  /** Rejected because the library already has this file; the user may upload it anyway. */
  duplicate: boolean;
  /** The user confirmed uploading a file the library already has. */
  allowDuplicate: boolean;
}

export type UploadQueueAction =
  | { type: 'add'; items: Array<Pick<UploadItem, 'id' | 'file'> & { resume?: ResumableUpload | null }> }
  | { type: 'start'; id: string }
  | { type: 'started'; id: string; resume: ResumableUpload }
  | {
      type: 'progress';
      id: string;
      uploadedBytes: number;
      bytesPerSecond: number | null;
      etaSeconds: number | null;
    }
  | { type: 'message'; id: string; message: string }
  | { type: 'finalizing'; id: string }
  | { type: 'completed'; id: string }
  | { type: 'failed'; id: string; message: string; resumable: boolean; duplicate?: boolean }
  | { type: 'uploadAnyway'; id: string }
  | { type: 'retry'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'clearFinished' };

const update = (items: UploadItem[], id: string, changes: Partial<UploadItem>): UploadItem[] =>
  items.map((item) => (item.id === id ? { ...item, ...changes } : item));

export function uploadQueueReducer(items: UploadItem[], action: UploadQueueAction): UploadItem[] {
  switch (action.type) {
    case 'add':
      return [
        ...items,
        ...action.items.map(
          ({ id, file, resume = null }): UploadItem => ({
            id,
            file,
            status: 'queued',
            uploadedBytes: 0,
            bytesPerSecond: null,
            etaSeconds: null,
            message: resume ? 'Oczekuje na wznowienie…' : 'W kolejce',
            slideId: resume?.slideId ?? null,
            resume,
            duplicate: false,
            allowDuplicate: false,
          }),
        ),
      ];
    case 'start':
      return update(items, action.id, { status: 'uploading', message: 'Rozpoczynanie przesyłania…' });
    case 'started':
      return update(items, action.id, {
        slideId: action.resume.slideId,
        resume: action.resume,
        message: 'Przesyłanie danych bezpośrednio do magazynu…',
      });
    case 'progress':
      return update(items, action.id, {
        uploadedBytes: action.uploadedBytes,
        bytesPerSecond: action.bytesPerSecond,
        etaSeconds: action.etaSeconds,
      });
    case 'message':
      return update(items, action.id, { message: action.message });
    case 'finalizing':
      return update(items, action.id, {
        status: 'finalizing',
        bytesPerSecond: null,
        etaSeconds: null,
        message: 'Finalizowanie przesyłania…',
      });
    case 'completed':
      return update(items, action.id, {
        status: 'completed',
        resume: null,
        message: 'Plik wgrany. Trwa przetwarzanie slajdu…',
      });
    case 'failed':
      return items.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: 'error',
              bytesPerSecond: null,
              etaSeconds: null,
              message: action.message,
              resume: action.resumable ? item.resume : null,
              slideId: action.resumable ? item.slideId : null,
              duplicate: action.duplicate ?? false,
            }
          : item,
      );
    case 'retry':
      return update(items, action.id, { status: 'queued', message: 'Oczekuje na wznowienie…' });
    case 'uploadAnyway':
      return update(items, action.id, { status: 'queued', duplicate: false, allowDuplicate: true, message: 'W kolejce' });
    case 'remove':
      return items.filter((item) => item.id !== action.id);
    case 'clearFinished':
      return items.filter((item) => item.status !== 'completed' && item.status !== 'error');
  }
}

/** The same file (name, size, modification time) is already waiting or being sent. */
export const isAlreadyQueued = (items: readonly UploadItem[], file: Pick<File, 'name' | 'size' | 'lastModified'>): boolean =>
  items.some(
    (item) =>
      (item.status === 'queued' || isActive(item)) &&
      item.file.name === file.name &&
      item.file.size === file.size &&
      item.file.lastModified === file.lastModified,
  );

export const isActive = (item: UploadItem): boolean => item.status === 'uploading' || item.status === 'finalizing';

/** Files go one after another (each one's parts in parallel): the next queued one, unless one is running. */
export const nextToStart = (items: readonly UploadItem[]): UploadItem | null =>
  items.some(isActive) ? null : (items.find((item) => item.status === 'queued') ?? null);

export interface QueueSummary {
  active: UploadItem | null;
  queuedCount: number;
  totalBytes: number;
  uploadedBytes: number;
}

/** What the global status bar shows: the running file plus how much is still waiting. */
export const summarizeQueue = (items: readonly UploadItem[]): QueueSummary => {
  const pending = items.filter((item) => item.status === 'queued' || isActive(item));
  return {
    active: items.find(isActive) ?? null,
    queuedCount: items.filter((item) => item.status === 'queued').length,
    totalBytes: pending.reduce((sum, item) => sum + item.file.size, 0),
    uploadedBytes: pending.reduce((sum, item) => sum + item.uploadedBytes, 0),
  };
};
