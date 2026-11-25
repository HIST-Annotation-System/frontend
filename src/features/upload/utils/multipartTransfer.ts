import { ApiError } from '../../../services/httpClient';
import type { UploadPart } from '../../../types/upload';
import { UploadCancelledError } from '../../../utils/errors';
import { splitIntoParts, type PartRange } from './chunking';
import { runWithConcurrency } from './runWithConcurrency';

/** Presigned URLs fetched per request - just ahead of the parts that need them. */
export const PRESIGN_BATCH_SIZE = 100;
/** Expired URLs (403) are re-presigned at most this many times per part. */
const MAX_URL_REFRESHES_PER_PART = 3;
const DEFAULT_RETRY = { attempts: 5, baseDelayMs: 1000 };
/** S3 answers 404 (NoSuchUpload) once the multipart upload was aborted - e.g. someone cancelled it. */
export const UPLOAD_GONE_CODE = 'upload_gone';
const UPLOAD_GONE_MESSAGE =
  'Wgrywanie zostało przerwane: slajd usunięto albo wgrywanie anulował inny administrator.';

/** The backend/storage calls a transfer needs (injected, so the logic is testable without a network). */
export interface PartTransport {
  presign: (partNumbers: number[]) => Promise<Record<string, string>>;
  putPart: (url: string, body: Blob, onProgress: (loadedBytes: number) => void, signal: AbortSignal) => Promise<string>;
}

export interface TransferOptions {
  file: Blob;
  partSize: number;
  /** Parts uploaded at the same time. */
  concurrency: number;
  transport: PartTransport;
  signal: AbortSignal;
  /** Called with the total bytes in storage plus in flight, whenever it changes. */
  onProgress: (uploadedBytes: number) => void;
  /** Parts already in storage (resuming an interrupted upload): they are skipped. */
  completedParts?: readonly UploadPart[];
  retry?: { attempts: number; baseDelayMs: number };
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

/** Errors worth retrying as-is: the connection dropped or storage had a hiccup. */
export const isTransientError = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.status === 0 || error.status === null || error.status === 408 || error.status === 429 || error.status >= 500);

const abortableSleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadCancelledError());
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new UploadCancelledError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });

/** Uploads the file's missing parts in parallel and resolves with every part's ETag, in part order.
 *
 * Each part retries transient failures with exponential backoff and re-presigns expired URLs, so a
 * short network drop costs one part, not the whole upload. The first unrecoverable error aborts the
 * parts still in flight and is rethrown.
 */
export async function transferParts({
  file,
  partSize,
  concurrency,
  transport,
  signal,
  onProgress,
  completedParts = [],
  retry = DEFAULT_RETRY,
  sleep = abortableSleep,
}: TransferOptions): Promise<UploadPart[]> {
  const parts = splitIntoParts(file.size, partSize);
  const etags = new Map(completedParts.map((part) => [part.PartNumber, part.ETag]));
  const pending = parts.filter((part) => !etags.has(part.partNumber));
  const pendingNumbers = pending.map((part) => part.partNumber);

  // One failed part stops the others too; the caller's signal stops everything.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });

  let storedBytes = parts.filter((part) => etags.has(part.partNumber)).reduce((sum, p) => sum + p.end - p.start, 0);
  const inFlight = new Map<number, number>();
  const report = () => onProgress(storedBytes + [...inFlight.values()].reduce((sum, loaded) => sum + loaded, 0));

  const urls = new Map<number, string>();
  let presigning: Promise<void> | null = null;
  const urlFor = async (partNumber: number): Promise<string> => {
    for (let attempt = 0; attempt < 2 && !urls.has(partNumber); attempt += 1) {
      if (!presigning) {
        const from = pendingNumbers.indexOf(partNumber);
        const batch = pendingNumbers.slice(from, from + PRESIGN_BATCH_SIZE).filter((number) => !urls.has(number));
        presigning = transport
          .presign(batch)
          .then((fetched) => Object.entries(fetched).forEach(([number, url]) => urls.set(Number(number), url)))
          .finally(() => {
            presigning = null;
          });
      }
      await presigning;
    }
    const url = urls.get(partNumber);
    if (!url) throw new ApiError(`No upload URL for part ${partNumber}.`);
    return url;
  };

  const uploadPart = async (part: PartRange) => {
    const body = file.slice(part.start, part.end);
    let refreshes = 0;
    let failures = 0;
    for (;;) {
      if (controller.signal.aborted) throw new UploadCancelledError();
      try {
        const url = await urlFor(part.partNumber);
        const etag = await transport.putPart(
          url,
          body,
          (loaded) => {
            inFlight.set(part.partNumber, loaded);
            report();
          },
          controller.signal,
        );
        inFlight.delete(part.partNumber);
        etags.set(part.partNumber, etag);
        storedBytes += part.end - part.start;
        report();
        return;
      } catch (error) {
        inFlight.delete(part.partNumber);
        report();
        if (error instanceof UploadCancelledError || controller.signal.aborted) throw new UploadCancelledError();
        if (error instanceof ApiError && error.status === 404) {
          throw new ApiError(UPLOAD_GONE_MESSAGE, 404, UPLOAD_GONE_CODE);
        }
        if (error instanceof ApiError && error.status === 403 && refreshes < MAX_URL_REFRESHES_PER_PART) {
          // URLs share one expiry, so drop them all rather than hitting 403 once per part.
          refreshes += 1;
          urls.clear();
          continue;
        }
        if (isTransientError(error) && failures < retry.attempts) {
          await sleep(retry.baseDelayMs * 2 ** failures, controller.signal);
          failures += 1;
          continue;
        }
        throw error;
      }
    }
  };

  try {
    await runWithConcurrency(pending, concurrency, async (part) => {
      try {
        await uploadPart(part);
      } catch (error) {
        controller.abort();
        throw error;
      }
    });
  } finally {
    signal.removeEventListener('abort', abort);
  }
  if (signal.aborted) throw new UploadCancelledError();

  return parts.map((part) => ({ PartNumber: part.partNumber, ETag: etags.get(part.partNumber) ?? '' }));
}
