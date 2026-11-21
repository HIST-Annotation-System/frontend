import { describe, expect, it } from 'vitest';
import type { ResumableUpload } from './resumableUploads';
import {
  isActive,
  isAlreadyQueued,
  nextToStart,
  summarizeQueue,
  uploadQueueReducer,
  type UploadItem,
  type UploadQueueAction,
} from './uploadQueue';

const file = (name = 'a.svs', size = 100, lastModified = 1): File =>
  ({ name, size, lastModified }) as File;

const resume = (slideId = 'slide-1'): ResumableUpload =>
  ({ slideId, uploadId: 'up-1', fileName: 'a.svs', fileSize: 100, lastModified: 1, partSize: 10 }) as ResumableUpload;

const run = (...actions: UploadQueueAction[]): UploadItem[] => actions.reduce(uploadQueueReducer, [] as UploadItem[]);

const added = (id = 'a', extra: Partial<{ resume: ResumableUpload; organizationId: number }> = {}): UploadQueueAction => ({
  type: 'add',
  items: [{ id, file: file(`${id}.svs`), ...extra }],
});

describe('uploadQueueReducer', () => {
  it('adds new files as queued, keeping what is already there', () => {
    const items = run(added('a'), added('b', { organizationId: 3 }));
    expect(items.map((item) => [item.id, item.status, item.message])).toEqual([
      ['a', 'queued', 'W kolejce'],
      ['b', 'queued', 'W kolejce'],
    ]);
    expect(items[0]).toMatchObject({ uploadedBytes: 0, slideId: null, resume: null, organizationId: null });
    expect(items[1].organizationId).toBe(3);
  });

  it('adds a resumable file with its slide', () => {
    const [item] = run(added('a', { resume: resume('s-9') }));
    expect(item.slideId).toBe('s-9');
    expect(item.message).toBe('Oczekuje na wznowienie…');
  });

  it('walks a file through start, progress, finalizing and completion', () => {
    let items = run(added('a'), { type: 'start', id: 'a' });
    expect(items[0].status).toBe('uploading');
    items = uploadQueueReducer(items, { type: 'started', id: 'a', resume: resume('s-1') });
    expect(items[0]).toMatchObject({ slideId: 's-1', message: 'Wgrywanie pliku…' });
    items = uploadQueueReducer(items, { type: 'progress', id: 'a', uploadedBytes: 40, bytesPerSecond: 10, etaSeconds: 6 });
    expect(items[0]).toMatchObject({ uploadedBytes: 40, bytesPerSecond: 10, etaSeconds: 6 });
    items = uploadQueueReducer(items, { type: 'finalizing', id: 'a' });
    expect(items[0]).toMatchObject({ status: 'finalizing', bytesPerSecond: null, etaSeconds: null });
    items = uploadQueueReducer(items, { type: 'completed', id: 'a' });
    expect(items[0]).toMatchObject({ status: 'completed', resume: null });
  });

  it('only touches the item named in the action', () => {
    const items = run(added('a'), added('b'), { type: 'message', id: 'b', message: 'hello' });
    expect(items.map((item) => item.message)).toEqual(['W kolejce', 'hello']);
  });

  it('keeps the upload to resume after a resumable failure', () => {
    const items = run(
      added('a'),
      { type: 'start', id: 'a' },
      { type: 'started', id: 'a', resume: resume('s-1') },
      { type: 'failed', id: 'a', message: 'network', resumable: true },
    );
    expect(items[0]).toMatchObject({ status: 'error', message: 'network', slideId: 's-1', duplicate: false });
    expect(items[0].resume?.slideId).toBe('s-1');
  });

  it('forgets the upload after a permanent failure', () => {
    const items = run(
      added('a'),
      { type: 'started', id: 'a', resume: resume('s-1') },
      { type: 'failed', id: 'a', message: 'gone', resumable: false },
    );
    expect(items[0]).toMatchObject({ resume: null, slideId: null });
  });

  it('lets the user upload a duplicate anyway', () => {
    let items = run(added('a'), { type: 'failed', id: 'a', message: 'dup', resumable: false, duplicate: true });
    expect(items[0].duplicate).toBe(true);
    items = uploadQueueReducer(items, { type: 'uploadAnyway', id: 'a' });
    expect(items[0]).toMatchObject({ status: 'queued', duplicate: false, allowDuplicate: true });
  });

  it('requeues on retry', () => {
    const items = run(added('a'), { type: 'failed', id: 'a', message: 'x', resumable: true }, { type: 'retry', id: 'a' });
    expect(items[0].status).toBe('queued');
  });

  it('removes one item, or every finished one', () => {
    const items = run(
      added('done'),
      added('failed'),
      added('waiting'),
      added('gone'),
      { type: 'completed', id: 'done' },
      { type: 'failed', id: 'failed', message: 'x', resumable: false },
      { type: 'remove', id: 'gone' },
    );
    expect(items.map((item) => item.id)).toEqual(['done', 'failed', 'waiting']);
    expect(uploadQueueReducer(items, { type: 'clearFinished' }).map((item) => item.id)).toEqual(['waiting']);
  });

  it('does not mutate the previous state', () => {
    const before = run(added('a'));
    const snapshot = structuredClone(before.map(({ file: _file, ...rest }) => rest));
    uploadQueueReducer(before, { type: 'start', id: 'a' });
    expect(before.map(({ file: _file, ...rest }) => rest)).toEqual(snapshot);
  });
});

describe('queue helpers', () => {
  const items = run(
    { type: 'add', items: [{ id: 'q', file: file('q.svs', 100, 5) }] },
    { type: 'add', items: [{ id: 'u', file: file('u.svs', 300, 5) }] },
    { type: 'add', items: [{ id: 'c', file: file('c.svs', 50, 5) }] },
    { type: 'start', id: 'u' },
    { type: 'progress', id: 'u', uploadedBytes: 120, bytesPerSecond: null, etaSeconds: null },
    { type: 'completed', id: 'c' },
  );

  it('recognises the same file waiting or running, not a finished one', () => {
    expect(isAlreadyQueued(items, file('q.svs', 100, 5))).toBe(true);
    expect(isAlreadyQueued(items, file('u.svs', 300, 5))).toBe(true);
    expect(isAlreadyQueued(items, file('c.svs', 50, 5))).toBe(false);
    expect(isAlreadyQueued(items, file('q.svs', 100, 6))).toBe(false);
    expect(isAlreadyQueued(items, file('q.svs', 101, 5))).toBe(false);
  });

  it('starts files one at a time', () => {
    expect(items.filter(isActive).map((item) => item.id)).toEqual(['u']);
    expect(nextToStart(items)).toBeNull();
    const idle = uploadQueueReducer(items, { type: 'completed', id: 'u' });
    expect(nextToStart(idle)?.id).toBe('q');
    expect(nextToStart([])).toBeNull();
  });

  it('summarises what is still waiting or running', () => {
    expect(summarizeQueue(items)).toEqual({
      active: expect.objectContaining({ id: 'u' }),
      queuedCount: 1,
      totalBytes: 400,
      uploadedBytes: 120,
    });
    expect(summarizeQueue([])).toEqual({ active: null, queuedCount: 0, totalBytes: 0, uploadedBytes: 0 });
  });
});
