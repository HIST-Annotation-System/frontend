import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/httpClient';
import { UploadCancelledError } from '../../../utils/errors';
import { PRESIGN_BATCH_SIZE, UPLOAD_GONE_CODE, isTransientError, transferParts, type PartTransport } from './multipartTransfer';

const NO_RETRY_DELAY = { attempts: 5, baseDelayMs: 1 };

interface FakeTransportOptions {
  /** Called before each PUT; throw to fail it. */
  failPut?: (partNumber: number, attempt: number) => void;
  /** Wait on this before answering each PUT. */
  gate?: Promise<void>;
}

/** Storage that answers part n with ETag "etag-n" and records every call. */
const fakeTransport = ({ failPut, gate }: FakeTransportOptions = {}) => {
  const presigned: number[][] = [];
  const attempts = new Map<number, number>();
  let urlVersion = 0;
  const transport: PartTransport = {
    presign: vi.fn(async (partNumbers: number[]) => {
      presigned.push(partNumbers);
      urlVersion += 1;
      return Object.fromEntries(partNumbers.map((n) => [String(n), `https://s3/part/${n}?v=${urlVersion}`]));
    }),
    putPart: vi.fn(async (url: string, body: Blob, onProgress: (loaded: number) => void, signal: AbortSignal) => {
      const partNumber = Number(new URL(url).pathname.split('/').pop());
      const attempt = (attempts.get(partNumber) ?? 0) + 1;
      attempts.set(partNumber, attempt);
      if (gate) await gate;
      if (signal.aborted) throw new UploadCancelledError();
      failPut?.(partNumber, attempt);
      onProgress(Math.floor(body.size / 2));
      onProgress(body.size);
      return `etag-${partNumber}`;
    }),
  };
  return { transport, presigned, attempts };
};

const blob = (size: number) => new Blob([new Uint8Array(size)]);

const transfer = (overrides: Partial<Parameters<typeof transferParts>[0]> & { transport: PartTransport }) =>
  transferParts({
    file: blob(25),
    partSize: 10,
    concurrency: 2,
    signal: new AbortController().signal,
    onProgress: () => undefined,
    retry: NO_RETRY_DELAY,
    sleep: async () => undefined,
    ...overrides,
  });

describe('isTransientError', () => {
  it.each([0, null, 408, 429, 500, 503])('retries status %s', (status) => {
    expect(isTransientError(new ApiError('x', status))).toBe(true);
  });

  it.each([400, 401, 403, 404, 409])('does not retry status %s', (status) => {
    expect(isTransientError(new ApiError('x', status))).toBe(false);
  });

  it('does not retry other errors', () => {
    expect(isTransientError(new Error('x'))).toBe(false);
  });
});

describe('transferParts', () => {
  it('uploads every part and returns the ETags in part order', async () => {
    const { transport } = fakeTransport();
    const progress: number[] = [];
    const parts = await transfer({ transport, onProgress: (bytes) => progress.push(bytes) });
    expect(parts).toEqual([
      { PartNumber: 1, ETag: 'etag-1' },
      { PartNumber: 2, ETag: 'etag-2' },
      { PartNumber: 3, ETag: 'etag-3' },
    ]);
    expect(progress.at(-1)).toBe(25);
    expect(Math.max(...progress)).toBe(25);
  });

  it('skips parts already in storage and counts them as uploaded', async () => {
    const { transport, presigned } = fakeTransport();
    const progress: number[] = [];
    const parts = await transfer({
      transport,
      completedParts: [{ PartNumber: 2, ETag: 'old-2' }],
      onProgress: (bytes) => progress.push(bytes),
    });
    expect(presigned.flat().sort()).toEqual([1, 3]);
    expect(parts.map((part) => part.ETag)).toEqual(['etag-1', 'old-2', 'etag-3']);
    expect(Math.min(...progress)).toBeGreaterThanOrEqual(10);
    expect(progress.at(-1)).toBe(25);
  });

  it('presigns in batches just ahead of the parts', async () => {
    const { transport, presigned } = fakeTransport();
    const parts = PRESIGN_BATCH_SIZE + 5;
    await transfer({ transport, file: blob(parts), partSize: 1, concurrency: 1 });
    expect(presigned.map((batch) => batch.length)).toEqual([PRESIGN_BATCH_SIZE, 5]);
    expect(presigned[1][0]).toBe(PRESIGN_BATCH_SIZE + 1);
  });

  it('retries transient failures with exponential backoff', async () => {
    const { transport, attempts } = fakeTransport({
      failPut: (part, attempt) => {
        if (part === 2 && attempt <= 2) throw new ApiError('network', 0);
      },
    });
    const delays: number[] = [];
    await transfer({
      transport,
      retry: { attempts: 5, baseDelayMs: 100 },
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect(attempts.get(2)).toBe(3);
    expect(delays).toEqual([100, 200]);
  });

  it('gives up after the last retry', async () => {
    const { transport } = fakeTransport({
      failPut: () => {
        throw new ApiError('server error', 503);
      },
    });
    await expect(transfer({ transport, retry: { attempts: 2, baseDelayMs: 1 } })).rejects.toMatchObject({ status: 503 });
  });

  it('re-presigns expired URLs, but not forever', async () => {
    const expiredOnce = fakeTransport({
      failPut: (part, attempt) => {
        if (part === 1 && attempt === 1) throw new ApiError('expired', 403);
      },
    });
    await transfer({ transport: expiredOnce.transport, concurrency: 1 });
    expect(expiredOnce.presigned.length).toBe(2);

    const alwaysExpired = fakeTransport({
      failPut: () => {
        throw new ApiError('expired', 403);
      },
    });
    await expect(transfer({ transport: alwaysExpired.transport, concurrency: 1 })).rejects.toMatchObject({ status: 403 });
    expect(alwaysExpired.attempts.get(1)).toBe(4); // first try + 3 refreshes
  });

  it('reports an aborted multipart upload as gone', async () => {
    const { transport } = fakeTransport({
      failPut: () => {
        throw new ApiError('NoSuchUpload', 404);
      },
    });
    await expect(transfer({ transport })).rejects.toMatchObject({ status: 404, code: UPLOAD_GONE_CODE });
  });

  it('does not retry permanent errors', async () => {
    const { transport, attempts } = fakeTransport({
      failPut: () => {
        throw new ApiError('bad request', 400);
      },
    });
    await expect(transfer({ transport, concurrency: 1 })).rejects.toMatchObject({ status: 400 });
    expect(attempts.get(1)).toBe(1);
    expect(attempts.has(2)).toBe(false);
  });

  it('stops when the caller cancels', async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const { transport } = fakeTransport({ gate });
    const controller = new AbortController();
    const running = transfer({ transport, signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    open();
    await expect(running).rejects.toBeInstanceOf(UploadCancelledError);
  });

  it('fails when storage gives no URL for a part', async () => {
    const transport: PartTransport = {
      presign: async () => ({}),
      putPart: async () => 'never',
    };
    await expect(transfer({ transport })).rejects.toThrow('No upload URL for part 1.');
  });
});
