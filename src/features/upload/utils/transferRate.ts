/** Throughput over a sliding time window - steadier than per-chunk speed, quicker to react than an average. */
const DEFAULT_WINDOW_MS = 5000;
/** Below this much elapsed time the rate is mostly noise from the first chunk's ramp-up. */
const MIN_SPAN_MS = 1000;

interface Sample {
  time: number;
  bytes: number;
}

export interface RateMeter {
  /** Records the total number of bytes transferred so far at `time` (ms). */
  record: (time: number, totalBytes: number) => void;
  /** Bytes per second over the window, or null until there is enough data. */
  bytesPerSecond: () => number | null;
}

export function createRateMeter(windowMs = DEFAULT_WINDOW_MS): RateMeter {
  const samples: Sample[] = [];
  return {
    record(time, totalBytes) {
      samples.push({ time, bytes: totalBytes });
      // Keep one sample older than the window so the span always covers the full window.
      while (samples.length > 2 && samples[1].time <= time - windowMs) samples.shift();
    },
    bytesPerSecond() {
      if (samples.length < 2) return null;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const span = last.time - first.time;
      if (span < MIN_SPAN_MS) return null;
      return Math.max(0, ((last.bytes - first.bytes) * 1000) / span);
    },
  };
}

export const estimateRemainingSeconds = (remainingBytes: number, bytesPerSecond: number | null): number | null =>
  bytesPerSecond && bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null;
