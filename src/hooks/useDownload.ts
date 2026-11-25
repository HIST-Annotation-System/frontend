import { useCallback, useState } from 'react';
import { saveBlob } from '../utils/download';
import { getErrorMessage } from '../utils/errors';

/** Fetches a file and offers it as a download, tracking progress and reporting failures. */
export function useDownload(onError: (message: string) => void) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(
    async (fetchFile: () => Promise<Blob>, filename: string, failureMessage: string) => {
      setIsDownloading(true);
      try {
        saveBlob(await fetchFile(), filename);
      } catch (error) {
        onError(getErrorMessage(error, failureMessage));
      } finally {
        setIsDownloading(false);
      }
    },
    [onError],
  );

  return { isDownloading, download };
}
