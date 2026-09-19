import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../../../services/httpClient';
import { slideQueryKeys } from '../../../services/slidesApi';
import {
  cancelUpload,
  completeMultipartUpload,
  getPresignedUrls,
  refreshPresignedUrls,
  startMultipartUpload,
  uploadChunkToStorage,
} from '../../../services/uploadApi';
import type { UploadPart } from '../../../types/upload';
import { getErrorMessage, UploadCancelledError } from '../../../utils/errors';
import { validateSlideFile } from '../slideFileRules';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_URL_REFRESHES_PER_PART = 3;

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  message: string;
  /** The slide created by this upload, once known - lets the caller watch it past "completed". */
  slideId: string | null;
}

const IDLE_STATE: UploadState = { status: 'idle', progress: 0, message: '', slideId: null };

const partNumbersFrom = (first: number, last: number): number[] =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index);

/** Uploads a slide in chunks straight to object storage via presigned URLs, then starts processing.
 *
 * Meant to be instantiated once and shared via a context mounted above the router (see
 * `UploadProvider`), so the upload keeps running - and stays visible - across page navigations
 * instead of being torn down whenever the panel that started it unmounts.
 */
export function useMultipartUpload() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>(IDLE_STATE);
  const [file, setFile] = useState<File | null>(null);
  // Tracks the upload started by `upload()` so `cancel()` can tear down the right one on the backend.
  const activeUploadRef = useRef<{ slideId: string; uploadId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
    activeUploadRef.current = null;
    abortRef.current = null;
  }, []);

  const selectFile = useCallback(
    (selected: File | null) => {
      setFile(selected);
      reset();
    },
    [reset],
  );

  const upload = useCallback(
    async (fileToUpload: File) => {
      const rejection = validateSlideFile(fileToUpload);
      if (rejection) {
        setState({ status: 'error', progress: 0, message: rejection, slideId: null });
        return;
      }

      const update = (changes: Partial<UploadState>) => setState((current) => ({ ...current, ...changes }));
      const totalParts = Math.max(1, Math.ceil(fileToUpload.size / CHUNK_SIZE));
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: 'uploading', progress: 0, message: 'Rozpoczynanie przesyłania…', slideId: null });

      try {
        const { slide_id: slideId, upload_id: uploadId } = await startMultipartUpload(fileToUpload.name);
        activeUploadRef.current = { slideId, uploadId };
        update({ slideId });
        void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });

        update({ message: 'Generowanie adresów przesyłania…' });
        const urls = [...(await getPresignedUrls(slideId, uploadId, totalParts)).urls];

        update({ message: 'Przesyłanie danych bezpośrednio do magazynu…' });
        const parts: UploadPart[] = [];
        let uploadedBytes = 0;
        let partIndex = 0;
        let refreshes = 0;
        while (partIndex < totalParts) {
          const start = partIndex * CHUNK_SIZE;
          const chunk = fileToUpload.slice(start, Math.min(start + CHUNK_SIZE, fileToUpload.size));
          try {
            const etag = await uploadChunkToStorage(
              urls[partIndex],
              chunk,
              (loaded) => update({ progress: Math.round(((uploadedBytes + loaded) / fileToUpload.size) * 100) }),
              controller.signal,
            );
            parts.push({ PartNumber: partIndex + 1, ETag: etag });
            uploadedBytes += chunk.size;
            partIndex += 1;
            refreshes = 0;
            update({ progress: Math.round((uploadedBytes / fileToUpload.size) * 100) });
          } catch (error) {
            if (error instanceof UploadCancelledError) throw error;
            // 403 means the presigned URLs expired: refresh the remaining ones and retry this part.
            if (!(error instanceof ApiError && error.status === 403) || refreshes >= MAX_URL_REFRESHES_PER_PART) {
              throw error;
            }
            refreshes += 1;
            update({ message: 'Odświeżanie adresów przesyłania…' });
            const refreshed = await refreshPresignedUrls(slideId, uploadId, partNumbersFrom(partIndex + 1, totalParts));
            Object.entries(refreshed.urls).forEach(([partNumber, url]) => {
              urls[Number(partNumber) - 1] = url;
            });
            update({ message: 'Wznawianie przesyłania…' });
          }
        }

        update({ message: 'Finalizowanie przesyłania…' });
        await completeMultipartUpload(slideId, uploadId, parts);
        activeUploadRef.current = null;
        setState({ status: 'completed', progress: 100, message: 'Plik wgrany. Trwa przetwarzanie slajdu…', slideId });
        void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
      } catch (error) {
        if (error instanceof UploadCancelledError) return; // `cancel()` already reset the state.
        // Drop the half-uploaded slide, so neither the bucket nor the library keeps it.
        const active = activeUploadRef.current;
        if (active) {
          activeUploadRef.current = null;
          await cancelUpload(active.slideId).catch(() => undefined);
          void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
        }
        update({ status: 'error', message: getErrorMessage(error, 'Wystąpił błąd podczas przesyłania.') });
      }
    },
    [queryClient],
  );

  /** Stops the in-flight chunk, best-effort tears down the upload on the backend, and clears the UI. */
  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const active = activeUploadRef.current;
    activeUploadRef.current = null;
    setFile(null);
    setState(IDLE_STATE);
    if (active) {
      try {
        await cancelUpload(active.slideId);
      } catch {
        // Best-effort: the slide row may already be gone (e.g. it finished before the abort landed).
      }
      void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
    }
  }, [queryClient]);

  return { ...state, file, selectFile, upload, cancel, reset };
}
