import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ApiError } from '../../../services/httpClient';
import { slideQueryKeys } from '../../../services/slidesApi';
import {
  completeMultipartUpload,
  getPresignedUrls,
  refreshPresignedUrls,
  startMultipartUpload,
  uploadChunkToStorage,
} from '../../../services/uploadApi';
import type { UploadPart } from '../../../types/upload';
import { getErrorMessage } from '../../../utils/errors';
import { validateSlideFile } from '../slideFileRules';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_URL_REFRESHES_PER_PART = 3;

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  message: string;
}

const IDLE_STATE: UploadState = { status: 'idle', progress: 0, message: '' };

const partNumbersFrom = (first: number, last: number): number[] =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index);

/** Uploads a slide in chunks straight to object storage via presigned URLs, then starts processing. */
export function useMultipartUpload() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>(IDLE_STATE);

  const reset = useCallback(() => setState(IDLE_STATE), []);

  const upload = useCallback(
    async (file: File) => {
      const rejection = validateSlideFile(file);
      if (rejection) {
        setState({ status: 'error', progress: 0, message: rejection });
        return;
      }

      const update = (changes: Partial<UploadState>) => setState((current) => ({ ...current, ...changes }));
      const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
      setState({ status: 'uploading', progress: 0, message: 'Rozpoczynanie przesyłania…' });

      try {
        const { slide_id: slideId, upload_id: uploadId } = await startMultipartUpload(file.name);
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
          const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
          try {
            const etag = await uploadChunkToStorage(urls[partIndex], chunk, (loaded) =>
              update({ progress: Math.round(((uploadedBytes + loaded) / file.size) * 100) }),
            );
            parts.push({ PartNumber: partIndex + 1, ETag: etag });
            uploadedBytes += chunk.size;
            partIndex += 1;
            refreshes = 0;
            update({ progress: Math.round((uploadedBytes / file.size) * 100) });
          } catch (error) {
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
        setState({ status: 'completed', progress: 100, message: 'Plik wgrany. Trwa przetwarzanie slajdu…' });
        void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
      } catch (error) {
        update({ status: 'error', message: getErrorMessage(error, 'Wystąpił błąd podczas przesyłania.') });
      }
    },
    [queryClient],
  );

  return { ...state, upload, reset };
}
