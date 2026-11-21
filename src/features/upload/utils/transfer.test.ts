import { describe, expect, it } from 'vitest';
import { formatBytes, formatDimensions, formatRemainingTime, formatTransferRate } from '../../../utils/format';
import { MAX_PARTS, MIN_PART_SIZE, choosePartSize, splitIntoParts } from './chunking';
import { runWithConcurrency } from './runWithConcurrency';
import { createRateMeter, estimateRemainingSeconds } from './transferRate';
import { describeTransfer, progressPercent } from './uploadProgress';

const MB = 1024 * 1024;
const GB = 1024 * MB;
/** Polish number formatting uses non-breaking spaces; compare with plain ones. */
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('chunking', () => {
  it('uses the minimum part size for ordinary files', () => {
    expect(choosePartSize(0)).toBe(MIN_PART_SIZE);
    expect(choosePartSize(10 * GB)).toBe(MIN_PART_SIZE);
  });

  it('grows the parts so a huge file stays within the part limit', () => {
    const size = 500 * GB;
    const partSize = choosePartSize(size);
    expect(partSize).toBeGreaterThan(MIN_PART_SIZE);
    expect(splitIntoParts(size, partSize)).toHaveLength(MAX_PARTS);
  });

  it('covers the whole file with contiguous 1-based parts', () => {
    const parts = splitIntoParts(25, 10);
    expect(parts).toEqual([
      { partNumber: 1, start: 0, end: 10 },
      { partNumber: 2, start: 10, end: 20 },
      { partNumber: 3, start: 20, end: 25 },
    ]);
  });

  it('splits an exact multiple without an empty tail', () => {
    expect(splitIntoParts(20, 10)).toHaveLength(2);
  });

  it('gives an empty file one empty part', () => {
    expect(splitIntoParts(0, 10)).toEqual([{ partNumber: 1, start: 0, end: 0 }]);
  });
});

describe('runWithConcurrency', () => {
  const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    return { promise, resolve, reject };
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('never runs more than the limit at once and starts items in order', async () => {
    const started: number[] = [];
    let running = 0;
    let peak = 0;
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      started.push(item);
      running += 1;
      peak = Math.max(peak, running);
      // Earlier items take longer, so later ones overtake them.
      await new Promise((resolve) => setTimeout(resolve, (6 - item) * 2));
      running -= 1;
    });
    expect(started).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it('starts nothing new after a failure, waits for running items and rethrows the first error', async () => {
    const started: number[] = [];
    const slow = deferred();
    let slowFinished = false;
    const done = runWithConcurrency([1, 2, 3, 4], 2, async (item) => {
      started.push(item);
      if (item === 1) throw new Error('first');
      if (item === 2) {
        await slow.promise;
        slowFinished = true;
        throw new Error('second');
      }
    });
    await flush();
    slow.resolve();
    await expect(done).rejects.toThrow('first');
    expect(slowFinished).toBe(true);
    expect(started).toEqual([1, 2]);
  });

  it('handles an empty list and a zero limit', async () => {
    await runWithConcurrency([], 3, async () => {
      throw new Error('never called');
    });
    const seen: number[] = [];
    await runWithConcurrency([1, 2], 0, async (item) => {
      seen.push(item);
    });
    expect(seen).toEqual([1, 2]);
  });
});

describe('transfer rate', () => {
  it('has no rate until there is a second of data', () => {
    const meter = createRateMeter();
    expect(meter.bytesPerSecond()).toBeNull();
    meter.record(0, 0);
    meter.record(500, 1000);
    expect(meter.bytesPerSecond()).toBeNull();
    meter.record(1000, 2000);
    expect(meter.bytesPerSecond()).toBe(2000);
  });

  it('measures over the sliding window only', () => {
    const meter = createRateMeter(2000);
    meter.record(0, 0);
    meter.record(1000, 100_000); // a fast start…
    meter.record(4000, 100_000);
    meter.record(5000, 101_000); // …then slow
    // The sample at 0 fell out; the one at 1000 is kept as the window's start: 1000 bytes over 4 s.
    expect(meter.bytesPerSecond()).toBe(250);
  });

  it('never reports a negative rate', () => {
    const meter = createRateMeter();
    meter.record(0, 1000);
    meter.record(2000, 0);
    expect(meter.bytesPerSecond()).toBe(0);
  });

  it('estimates the remaining time', () => {
    expect(estimateRemainingSeconds(1000, 100)).toBe(10);
    expect(estimateRemainingSeconds(1000, null)).toBeNull();
    expect(estimateRemainingSeconds(1000, 0)).toBeNull();
  });
});

describe('progress and formatting', () => {
  const item = (uploadedBytes: number, size: number, bytesPerSecond: number | null = null, etaSeconds: number | null = null) => ({
    uploadedBytes,
    file: { size } as File,
    bytesPerSecond,
    etaSeconds,
  });

  it('rounds progress down and caps it', () => {
    expect(progressPercent(item(999, 1000))).toBe(99);
    expect(progressPercent(item(2000, 1000))).toBe(100);
    expect(progressPercent(item(0, 0))).toBe(100);
  });

  it('describes a transfer once the speed is known', () => {
    expect(describeTransfer(item(500, 1000))).toBe('50%');
    expect(plain(describeTransfer(item(500, 1000, 2 * MB, 80)))).toBe('50% · 2,0 MB/s · zostało ~1 min 20 s');
  });

  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1,0 KB'],
    [1536, '1,5 KB'],
    [10 * 1024, '10 KB'],
    [5 * GB, '5,0 GB'],
    [2048 * 1024 * GB, '2048 TB'],
  ])('formats %i bytes as %s', (bytes, text) => {
    expect(plain(formatBytes(bytes))).toBe(text);
  });

  it('formats rates and dimensions', () => {
    expect(plain(formatTransferRate(MB))).toBe('1,0 MB/s');
    expect(plain(formatDimensions(40000, 30000))).toBe('40 000 × 30 000 px');
    expect(formatDimensions(null, 10)).toBe('—');
    expect(formatDimensions(0, 10)).toBe('—');
  });

  it.each([
    [0, '~1 s'],
    [44.6, '~45 s'],
    [60, '~1 min'],
    [200, '~3 min 20 s'],
    [3600, '~1 h'],
    [3900, '~1 h 5 min'],
  ])('formats %f seconds left as %s', (seconds, text) => {
    expect(formatRemainingTime(seconds)).toBe(text);
  });
});
