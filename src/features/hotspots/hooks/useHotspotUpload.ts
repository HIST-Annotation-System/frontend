import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { hotspotQueryKeys, uploadHotspotImage } from '../../../services/hotspotsApi';
import { getErrorMessage } from '../../../utils/errors';

interface HotspotUploadFailure {
  fileName: string;
  message: string;
}

interface HotspotUploadState {
  /** The folder the files go to. */
  folderId: string | null;
  folderName: string | null;
  isUploading: boolean;
  done: number;
  total: number;
  /** The file currently being sent. */
  current: string | null;
  failures: HotspotUploadFailure[];
  /** Picked files that were not PNG/JPEG and were never sent. */
  skipped: number;
}

const IDLE: HotspotUploadState = { folderId: null, folderName: null, isUploading: false, done: 0, total: 0, current: null, failures: [], skipped: 0 };

/**
 * Uploads images into a hotspot folder one by one: the server handles a single file per request, so one
 * bad file only fails itself, and progress is reported per file. Each saved image appears in the
 * catalog right away. Used through `HotspotUploadProvider`, so uploads go on while navigating in the app.
 */
export function useHotspotUpload() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<HotspotUploadState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (folderId: string, folderName: string, files: File[], skipped: number) => {
      // One upload at a time: a second one would mix its progress into the first and could not be cancelled.
      if (abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      const failures: HotspotUploadFailure[] = [];
      setState({ folderId, folderName, isUploading: true, done: 0, total: files.length, current: null, failures, skipped });

      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) break;
        setState((previous) => ({ ...previous, current: file.webkitRelativePath || file.name }));
        try {
          await uploadHotspotImage(folderId, file, controller.signal);
          void queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });
        } catch (error) {
          if (controller.signal.aborted) break;
          failures.push({ fileName: file.webkitRelativePath || file.name, message: getErrorMessage(error, 'Błąd wgrywania.') });
        }
        setState((previous) => ({ ...previous, done: index + 1, failures: [...failures] }));
      }

      abortRef.current = null;
      setState((previous) => ({ ...previous, isUploading: false, current: null }));
    },
    [queryClient],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, upload, cancel, reset };
}
