import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ApiError } from '../../../services/httpClient';
import { slideQueryKeys } from '../../../services/slidesApi';
import {
  cancelUpload,
  completeMultipartUpload,
  listUploadedParts,
  presignParts,
  reportUploadProgress,
  startMultipartUpload,
  uploadChunkToStorage,
} from '../../../services/uploadApi';
import type { UploadedPart } from '../../../types/upload';
import { getErrorMessage, UploadCancelledError } from '../../../utils/errors';
import { validateSlideFile } from '../slideFileRules';
import { choosePartSize } from '../utils/chunking';
import { isTransientError, transferParts, type PartTransport } from '../utils/multipartTransfer';
import {
  claimUpload,
  findAbandonedUploads,
  forgetUpload,
  isSameFile,
  rememberUpload,
  UPLOAD_RUNNING_ELSEWHERE_MESSAGE,
  type ResumableUpload,
} from '../utils/resumableUploads';
import { createRateMeter, estimateRemainingSeconds } from '../utils/transferRate';
import type { Slide } from '../../../types/slide';
import { isActive, isAlreadyQueued, nextToStart, uploadQueueReducer, type UploadItem } from '../utils/uploadQueue';

const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 8;
/** Parts uploaded in parallel; override with VITE_UPLOAD_CONCURRENCY (1-8). */
export const UPLOAD_CONCURRENCY = Math.min(
  MAX_CONCURRENCY,
  Math.max(1, Math.trunc(Number(import.meta.env.VITE_UPLOAD_CONCURRENCY)) || DEFAULT_CONCURRENCY),
);
/** Progress re-renders at most this often; the bytes themselves are tracked continuously. */
const PROGRESS_INTERVAL_MS = 250;
/** A tab that closed or crashed writes nothing, so interrupted uploads are also re-checked periodically. */
const ABANDONED_CHECK_INTERVAL_MS = 5000;
/** Progress is shared with other clients at most this often, and only when it moved by at least a percent. */
const PROGRESS_REPORT_INTERVAL_MS = 2000;
const DUPLICATE_SLIDE_CODE = 'duplicate_slide';
const INTERRUPTED_MESSAGE = 'Połączenie zostało przerwane. Możesz wznowić przesyłanie od miejsca, w którym się zatrzymało.';
const CANNOT_RESUME_MESSAGE =
  'Nie można wznowić: przesyłanie zostało anulowane albo slajd usunięto. Wgraj plik ponownie.';
const WRONG_FILE_MESSAGE = 'To nie jest ten sam plik (nazwa, rozmiar lub data modyfikacji się różnią).';

const newItemId = () => crypto.randomUUID();

const duplicateMessage = (existing: Slide | undefined): string =>
  existing
    ? `Ten plik jest już w bibliotece jako „${existing.name}”. Możesz go wgrać mimo to.`
    : 'Ten plik (ta sama nazwa i rozmiar) jest już w bibliotece. Możesz go wgrać mimo to.';

/** Fire-and-forget progress reports for one upload: throttled, never overlapping, failures ignored. */
const createProgressReporter = (slideId: string) => {
  let lastPercent = -1;
  let lastAt = 0;
  let sending = false;
  return (percent: number, now: number) => {
    if (sending || percent <= lastPercent || now - lastAt < PROGRESS_REPORT_INTERVAL_MS) return;
    sending = true;
    lastPercent = percent;
    lastAt = now;
    void reportUploadProgress(slideId, percent)
      .catch(() => undefined)
      .finally(() => {
        sending = false;
      });
  };
};

const transportFor = (slideId: string, uploadId: string): PartTransport => ({
  presign: async (partNumbers) => (await presignParts(slideId, uploadId, partNumbers)).urls,
  putPart: (url, body, onProgress, signal) => uploadChunkToStorage(url, body, onProgress, signal),
});

/** Queue of slide uploads straight to object storage: one file at a time, its parts in parallel.
 *
 * Instantiated once in `UploadProvider` above the router, so uploads keep running - and stay
 * visible - across page navigations.
 */
export function useUploadQueue() {
  const queryClient = useQueryClient();
  const [items, dispatch] = useReducer(uploadQueueReducer, []);
  // Remembered uploads no tab is running (one running in another tab of this browser isn't "interrupted").
  const [abandoned, setAbandoned] = useState<ResumableUpload[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const runningId = useRef<string | null>(null);
  const [finishedRuns, setFinishedRuns] = useState(0);

  const refreshSlides = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all }),
    [queryClient],
  );

  const run = useCallback(
    async (item: UploadItem) => {
      const { id, file } = item;
      const rejection = validateSlideFile(file);
      if (rejection) {
        dispatch({ type: 'failed', id, message: rejection, resumable: false });
        return;
      }
      const controller = new AbortController();
      controllers.current.set(id, controller);
      dispatch({ type: 'start', id });

      let session = item.resume;
      let release = () => {};
      try {
        let completedParts: UploadedPart[] = [];
        if (session) {
          try {
            release = await claimUpload(session.slideId);
          } catch {
            // Another tab is running it: leave its session alone, this item just can't proceed.
            dispatch({ type: 'failed', id, message: UPLOAD_RUNNING_ELSEWHERE_MESSAGE, resumable: false });
            return;
          }
          try {
            completedParts = (await listUploadedParts(session.slideId, session.uploadId)).parts;
          } catch (error) {
            if (isTransientError(error)) throw error;
            forgetUpload(session.slideId);
            session = null;
            dispatch({ type: 'failed', id, message: CANNOT_RESUME_MESSAGE, resumable: false });
            return;
          }
        } else {
          let started;
          try {
            started = await startMultipartUpload(file, item.allowDuplicate);
          } catch (error) {
            if (!(error instanceof ApiError && error.code === DUPLICATE_SLIDE_CODE)) throw error;
            const existing = queryClient
              .getQueryData<Slide[]>(slideQueryKeys.list())
              ?.find((slide) => slide.original_filename === file.name && slide.file_size_bytes === file.size);
            dispatch({ type: 'failed', id, message: duplicateMessage(existing), resumable: false, duplicate: true });
            return;
          }
          // Claimed before it is remembered, so no other tab ever sees it as abandoned.
          release = await claimUpload(started.slide_id);
          session = {
            slideId: started.slide_id,
            uploadId: started.upload_id,
            fileName: file.name,
            fileSize: file.size,
            lastModified: file.lastModified,
            partSize: choosePartSize(file.size),
            startedAt: new Date().toISOString(),
          };
          rememberUpload(session);
          refreshSlides();
        }
        dispatch({ type: 'started', id, resume: session });

        const meter = createRateMeter();
        const shareProgress = createProgressReporter(session.slideId);
        let lastEmit = 0;
        const parts = await transferParts({
          file,
          partSize: session.partSize,
          concurrency: UPLOAD_CONCURRENCY,
          transport: transportFor(session.slideId, session.uploadId),
          signal: controller.signal,
          completedParts,
          onProgress: (uploadedBytes) => {
            const now = performance.now();
            meter.record(now, uploadedBytes);
            if (file.size > 0) shareProgress(Math.floor((uploadedBytes / file.size) * 100), now);
            if (now - lastEmit < PROGRESS_INTERVAL_MS && uploadedBytes < file.size) return;
            lastEmit = now;
            const rate = meter.bytesPerSecond();
            dispatch({
              type: 'progress',
              id,
              uploadedBytes,
              bytesPerSecond: rate,
              etaSeconds: estimateRemainingSeconds(file.size - uploadedBytes, rate),
            });
          },
        });

        dispatch({ type: 'finalizing', id });
        await completeMultipartUpload(session.slideId, session.uploadId, parts);
        forgetUpload(session.slideId);
        dispatch({ type: 'completed', id });
        refreshSlides();
      } catch (error) {
        if (error instanceof UploadCancelledError) return; // `cancel()` already cleaned up.
        if (session && isTransientError(error)) {
          // Keep what's in storage: the same file can continue from here, now or after a reload.
          dispatch({ type: 'failed', id, message: INTERRUPTED_MESSAGE, resumable: true });
          return;
        }
        // Anything else (rejected file, slide deleted meanwhile...) can't be continued: drop the leftovers.
        if (session) {
          forgetUpload(session.slideId);
          if (!(error instanceof ApiError && error.status === 404)) {
            await cancelUpload(session.slideId).catch(() => undefined);
          }
          refreshSlides();
        }
        dispatch({ type: 'failed', id, message: getErrorMessage(error, 'Wystąpił błąd podczas przesyłania.'), resumable: false });
      } finally {
        release();
        controllers.current.delete(id);
      }
    },
    [queryClient, refreshSlides],
  );

  // Start the next file once the previous one is done. The ref guards against starting twice before
  // the "uploading" status lands; the counter re-runs this effect when a run ends without other changes.
  useEffect(() => {
    if (runningId.current !== null) return;
    const next = nextToStart(items);
    if (!next) return;
    runningId.current = next.id;
    void run(next).finally(() => {
      runningId.current = null;
      setFinishedRuns((count) => count + 1);
    });
  }, [items, run, finishedRuns]);

  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      void findAbandonedUploads().then((uploads) => {
        if (mounted) setAbandoned(uploads);
      });
    refresh();
    // Another tab started, finished or discarded an upload.
    window.addEventListener('storage', refresh);
    const timer = window.setInterval(refresh, ABANDONED_CHECK_INTERVAL_MS);
    return () => {
      mounted = false;
      window.removeEventListener('storage', refresh);
      window.clearInterval(timer);
    };
  }, []);
  // This tab's own failed uploads are already in the queue, with their own "resume".
  const interrupted = abandoned.filter((upload) => !items.some((item) => item.slideId === upload.slideId));

  // Leaving the page mid-upload would interrupt it: let the browser ask first.
  const hasActive = items.some(isActive);
  useEffect(() => {
    if (!hasActive) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasActive]);

  /** Adds files to the queue; returns how many were skipped because they are already waiting or being sent. */
  const enqueue = useCallback(
    (files: Iterable<File>): number => {
      const picked = [...files];
      const fresh = picked.filter(
        (file, index) =>
          !isAlreadyQueued(items, file) &&
          picked.findIndex(
            (other) => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified,
          ) === index,
      );
      if (fresh.length > 0) dispatch({ type: 'add', items: fresh.map((file) => ({ id: newItemId(), file })) });
      return picked.length - fresh.length;
    },
    [items],
  );

  const uploadAnyway = useCallback((id: string) => dispatch({ type: 'uploadAnyway', id }), []);

  /** Stops the item (in flight or queued) and drops its upload on the backend. */
  const cancel = useCallback(
    async (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      controllers.current.get(id)?.abort();
      dispatch({ type: 'remove', id });
      if (item?.slideId && item.status !== 'completed') {
        forgetUpload(item.slideId);
        await cancelUpload(item.slideId).catch(() => undefined);
        refreshSlides();
      }
    },
    [items, refreshSlides],
  );

  const retry = useCallback((id: string) => dispatch({ type: 'retry', id }), []);
  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const clearFinished = useCallback(() => dispatch({ type: 'clearFinished' }), []);

  /** Continues an upload interrupted by a reload; `file` must be the very file it was started with. */
  const resumeInterrupted = useCallback((upload: ResumableUpload, file: File): string | null => {
    if (!isSameFile(upload, file)) return WRONG_FILE_MESSAGE;
    setAbandoned((current) => current.filter((candidate) => candidate.slideId !== upload.slideId));
    dispatch({ type: 'add', items: [{ id: newItemId(), file, resume: upload }] });
    return null;
  }, []);

  const discardInterrupted = useCallback(
    async (upload: ResumableUpload) => {
      setAbandoned((current) => current.filter((candidate) => candidate.slideId !== upload.slideId));
      forgetUpload(upload.slideId);
      await cancelUpload(upload.slideId).catch(() => undefined);
      refreshSlides();
    },
    [refreshSlides],
  );

  return {
    items,
    interrupted,
    enqueue,
    uploadAnyway,
    cancel,
    retry,
    remove,
    clearFinished,
    resumeInterrupted,
    discardInterrupted,
  };
}
