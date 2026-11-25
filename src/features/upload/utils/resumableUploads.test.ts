import { describe, expect, it } from 'vitest';
import {
  UPLOAD_RUNNING_ELSEWHERE_MESSAGE,
  claimUpload,
  findAbandonedUploads,
  forgetUpload,
  isSameFile,
  loadResumableUploads,
  rememberUpload,
  type ResumableUpload,
} from './resumableUploads';

const KEY = 'hist.resumableUploads';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  failWrites = false;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('quota', 'QuotaExceededError');
    this.data.set(key, value);
  }
}

const upload = (slideId: string, extra: Partial<ResumableUpload> = {}): ResumableUpload => ({
  slideId,
  uploadId: `u-${slideId}`,
  fileName: 'a.svs',
  fileSize: 100,
  lastModified: 7,
  partSize: 10,
  startedAt: '2026-01-01T00:00:00Z',
  ...extra,
});

/** A minimal Web Locks stand-in: one holder per name, `ifAvailable` gets null when taken. */
class FakeLocks {
  held = new Set<string>();
  queryFails = false;

  request(name: string, _options: LockOptions, callback: (lock: Lock | null) => unknown): Promise<unknown> {
    if (this.held.has(name)) return Promise.resolve(callback(null));
    this.held.add(name);
    const result = Promise.resolve(callback({ name, mode: 'exclusive' } as Lock));
    return result.finally(() => this.held.delete(name));
  }

  async query(): Promise<LockManagerSnapshot> {
    if (this.queryFails) throw new Error('unsupported');
    return { held: [...this.held].map((name) => ({ name, mode: 'exclusive', clientId: 'x' })), pending: [] };
  }
}

const locks = (fake: FakeLocks) => fake as unknown as Pick<LockManager, 'request' | 'query'>;

describe('remembered uploads', () => {
  it('starts empty', () => {
    expect(loadResumableUploads(new MemoryStorage())).toEqual([]);
    expect(loadResumableUploads(undefined)).toEqual([]);
  });

  it('remembers, replaces and forgets uploads by slide', () => {
    const storage = new MemoryStorage();
    rememberUpload(upload('a'), storage);
    rememberUpload(upload('b'), storage);
    rememberUpload(upload('a', { uploadId: 'newer' }), storage);
    expect(loadResumableUploads(storage).map((item) => [item.slideId, item.uploadId])).toEqual([
      ['b', 'u-b'],
      ['a', 'newer'],
    ]);
    forgetUpload('b', storage);
    forgetUpload('a', storage);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('ignores corrupt or foreign data', () => {
    const storage = new MemoryStorage();
    storage.setItem(KEY, '{not json');
    expect(loadResumableUploads(storage)).toEqual([]);
    storage.setItem(KEY, JSON.stringify({ slideId: 'a' }));
    expect(loadResumableUploads(storage)).toEqual([]);
    storage.setItem(KEY, JSON.stringify([upload('ok'), { slideId: 'broken' }, null, 'x']));
    expect(loadResumableUploads(storage).map((item) => item.slideId)).toEqual(['ok']);
  });

  it('keeps working when storage refuses writes', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    expect(() => rememberUpload(upload('a'), storage)).not.toThrow();
    expect(loadResumableUploads(storage)).toEqual([]);
  });

  it('matches the file by name, size and modification time', () => {
    const saved = upload('a');
    expect(isSameFile(saved, { name: 'a.svs', size: 100, lastModified: 7 })).toBe(true);
    expect(isSameFile(saved, { name: 'b.svs', size: 100, lastModified: 7 })).toBe(false);
    expect(isSameFile(saved, { name: 'a.svs', size: 101, lastModified: 7 })).toBe(false);
    expect(isSameFile(saved, { name: 'a.svs', size: 100, lastModified: 8 })).toBe(false);
  });
});

describe('claiming uploads across tabs', () => {
  it('claims a free upload until released', async () => {
    const fake = new FakeLocks();
    const release = await claimUpload('a', locks(fake));
    expect(fake.held.has('hist.upload.a')).toBe(true);
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fake.held.size).toBe(0);
  });

  it('refuses an upload another tab is running', async () => {
    const fake = new FakeLocks();
    await claimUpload('a', locks(fake));
    await expect(claimUpload('a', locks(fake))).rejects.toThrow(UPLOAD_RUNNING_ELSEWHERE_MESSAGE);
  });

  it('is a no-op without Web Locks', async () => {
    const release = await claimUpload('a', null);
    expect(release()).toBeUndefined();
  });

  it('lists only the uploads no tab is running', async () => {
    const storage = new MemoryStorage();
    rememberUpload(upload('running'), storage);
    rememberUpload(upload('abandoned'), storage);
    const fake = new FakeLocks();
    await claimUpload('running', locks(fake));
    expect((await findAbandonedUploads(storage, locks(fake))).map((item) => item.slideId)).toEqual(['abandoned']);
  });

  it('treats every upload as abandoned when locks cannot be queried', async () => {
    const storage = new MemoryStorage();
    rememberUpload(upload('a'), storage);
    const fake = new FakeLocks();
    fake.queryFails = true;
    expect(await findAbandonedUploads(storage, locks(fake))).toHaveLength(1);
    expect(await findAbandonedUploads(storage, null)).toHaveLength(1);
  });
});
