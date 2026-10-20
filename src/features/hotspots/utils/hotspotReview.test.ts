import { describe, expect, it } from 'vitest';
import { ALL_FOLDERS, hotspotStatus, readCatalogParams, resolveFolderId, writeCatalogParams } from './hotspotReview';

const read = (search: string) => readCatalogParams(new URLSearchParams(search));

describe('hotspot catalog params', () => {
  it('falls back to the browse defaults', () => {
    expect(read('')).toEqual({
      mode: 'browse',
      folder: null,
      sort: 'created_at',
      order: 'desc',
      status: null,
      tagIds: [],
    });
  });

  it('presets status and sort per mode', () => {
    expect(read('mode=assess')).toMatchObject({ status: 'untagged', sort: 'created_at' });
    expect(read('mode=reannotate')).toMatchObject({ status: 'to_reannotate', sort: 'score', order: 'desc' });
  });

  it('lets the URL override the mode defaults, including any status', () => {
    expect(read('mode=reannotate&status=all&sort=entropy&order=asc&tags=3,x,7')).toMatchObject({
      status: null,
      sort: 'entropy',
      order: 'asc',
      tagIds: [3, 7],
    });
  });

  it('round-trips, leaving the defaults out', () => {
    expect(writeCatalogParams(read('mode=reannotate'))).toEqual({ mode: 'reannotate' });
    const search = 'mode=reannotate&folder=f1&sort=entropy&status=all&tags=2,5';
    expect(writeCatalogParams(read(search))).toEqual(Object.fromEntries(new URLSearchParams(search)));
  });

  it('lists every folder in the review modes unless one is picked', () => {
    expect(resolveFolderId(read(''), 'first')).toBe('first');
    expect(resolveFolderId(read(`folder=${ALL_FOLDERS}`), 'first')).toBeNull();
    expect(resolveFolderId(read('mode=assess'), 'first')).toBeNull();
    expect(resolveFolderId(read('mode=assess&folder=f2'), 'first')).toBe('f2');
  });

  it('keeps assessing on untagged hotspots, without tag sorts or filters', () => {
    expect(read('mode=assess&sort=score&status=all&tags=3')).toMatchObject({
      sort: 'created_at',
      status: 'untagged',
      tagIds: [],
    });
    expect(read('mode=assess&sort=entropy').sort).toBe('entropy');
  });

  it('derives the review status from the verdict tags', () => {
    const tag = (dimension: 'importance' | 'accuracy' | null) => ({ id: 1, name: 'x', dimension, weight: 1 });
    expect(hotspotStatus({ tags: [tag('importance'), tag(null)], reannotated_at: null })).toBe('untagged');
    expect(hotspotStatus({ tags: [tag('importance'), tag('accuracy')], reannotated_at: null })).toBe('to_reannotate');
    expect(hotspotStatus({ tags: [], reannotated_at: '2026-10-20T12:00:00Z' })).toBe('reannotated');
  });
});
