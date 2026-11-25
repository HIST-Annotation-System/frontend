/** Runs `worker` over `items` with at most `limit` in flight, in order of `items`.
 *
 * After the first failure no new items are started; the ones already running are awaited (so nothing
 * keeps going in the background) and the first error is rethrown. Abort the work itself via its own
 * signal - this only schedules it.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const state: { next: number; failure: { error: unknown } | null } = { next: 0, failure: null };

  const lane = async () => {
    while (state.failure === null && state.next < items.length) {
      const item = items[state.next];
      state.next += 1;
      try {
        await worker(item);
      } catch (error) {
        state.failure ??= { error };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  if (state.failure !== null) throw state.failure.error;
}
