/** Uploads started in this browser, remembered so one interrupted by a reload or a crash can be resumed.
 *
 * Only identifiers live here - a page can't keep access to a picked file across reloads, so resuming
 * asks for the same file again and checks it against what was recorded.
 */
export interface ResumableUpload {
  slideId: string;
  uploadId: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  /** Parts must be cut the same way as before, or the stored ones wouldn't line up. */
  partSize: number;
  startedAt: string;
}

const STORAGE_KEY = 'hist.resumableUploads';

type FileIdentity = Pick<File, 'name' | 'size' | 'lastModified'>;

const isResumableUpload = (value: unknown): value is ResumableUpload => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.slideId === 'string' &&
    typeof record.uploadId === 'string' &&
    typeof record.fileName === 'string' &&
    typeof record.fileSize === 'number' &&
    typeof record.lastModified === 'number' &&
    typeof record.partSize === 'number'
  );
};

// Storage can be unavailable (private mode, blocked site data): resuming is then simply not offered.
export const loadResumableUploads = (storage: Storage | undefined = globalThis.localStorage): ResumableUpload[] => {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isResumableUpload) : [];
  } catch {
    return [];
  }
};

const save = (uploads: ResumableUpload[], storage: Storage | undefined) => {
  try {
    if (uploads.length === 0) storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, JSON.stringify(uploads));
  } catch {
    // Best-effort, see loadResumableUploads.
  }
};

export const rememberUpload = (upload: ResumableUpload, storage: Storage | undefined = globalThis.localStorage) =>
  save([...loadResumableUploads(storage).filter((item) => item.slideId !== upload.slideId), upload], storage);

export const forgetUpload = (slideId: string, storage: Storage | undefined = globalThis.localStorage) =>
  save(
    loadResumableUploads(storage).filter((item) => item.slideId !== slideId),
    storage,
  );

/** Whether `file` is the file the upload was started with (same name, size and modification time). */
export const isSameFile = (upload: ResumableUpload, file: FileIdentity): boolean =>
  file.name === upload.fileName && file.size === upload.fileSize && file.lastModified === upload.lastModified;

type UploadLocks = Pick<LockManager, 'request' | 'query'>;

const LOCK_PREFIX = 'hist.upload.';
export const UPLOAD_RUNNING_ELSEWHERE_MESSAGE = 'To przesyłanie trwa już w innej karcie przeglądarki.';

export const uploadLockName = (slideId: string): string => `${LOCK_PREFIX}${slideId}`;

const browserLocks = (): UploadLocks | null => globalThis.navigator?.locks ?? null;

/** Claims an upload for this tab until the returned release function is called (or the tab closes).
 *
 * The list above is shared by every tab, so this is how another tab tells "still running over there"
 * from "abandoned". Rejects when another tab already runs the same upload. Without Web Locks it is a
 * no-op: every tab then treats unknown uploads as interrupted, which only offers a needless "resume".
 */
export const claimUpload = (slideId: string, locks: UploadLocks | null = browserLocks()): Promise<() => void> => {
  if (!locks) return Promise.resolve(() => undefined);
  return new Promise((claimed, refused) => {
    locks
      .request(uploadLockName(slideId), { ifAvailable: true }, (lock) => {
        if (lock === null) {
          refused(new Error(UPLOAD_RUNNING_ELSEWHERE_MESSAGE));
          return undefined;
        }
        // Held for as long as this promise is pending.
        return new Promise<void>((release) => claimed(release));
      })
      .catch(() => claimed(() => undefined));
  });
};

/** Uploads remembered in this browser that no tab is running any more. */
export const findAbandonedUploads = async (
  storage: Storage | undefined = globalThis.localStorage,
  locks: UploadLocks | null = browserLocks(),
): Promise<ResumableUpload[]> => {
  const uploads = loadResumableUploads(storage);
  if (!locks || uploads.length === 0) return uploads;
  try {
    const { held = [] } = await locks.query();
    const running = new Set(held.map((lock) => lock.name));
    return uploads.filter((upload) => !running.has(uploadLockName(upload.slideId)));
  } catch {
    return uploads;
  }
};
