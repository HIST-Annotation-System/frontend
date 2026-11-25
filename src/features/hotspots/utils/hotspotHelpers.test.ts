// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HotspotFolder } from '../../../types/hotspot';
import { formatFeature, heatColor, normalize, summarizeFeature } from './boxStats';
import { sameOrganizationFolders } from './folderOrganization';
import { formatLength, formatSquareSize } from './hotspotFormat';
import { sortOptionsFor } from './hotspotSort';
import { readLastFolderId, rememberLastFolderId } from './lastFolder';
import { pageNumbers, pageSlice } from './pagination';

const plain = (text: string) => text.replace(/\s/g, ' ');

describe('pageSlice', () => {
  it('slices the requested page', () => {
    expect(pageSlice(25, 2, 10)).toEqual({ page: 2, pageCount: 3, start: 10, end: 20 });
    expect(pageSlice(25, 3, 10)).toEqual({ page: 3, pageCount: 3, start: 20, end: 25 });
  });

  it('clamps pages out of range', () => {
    expect(pageSlice(25, 99, 10).page).toBe(3);
    expect(pageSlice(25, 0, 10).page).toBe(1);
    expect(pageSlice(25, -4, 10).page).toBe(1);
    expect(pageSlice(25, Number.NaN, 10).page).toBe(1);
    expect(pageSlice(25, 2.7, 10).page).toBe(2);
  });

  it('has one empty page for an empty list', () => {
    expect(pageSlice(0, 5, 10)).toEqual({ page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it('puts everything on one page for an infinite page size', () => {
    expect(pageSlice(25, 3, Number.POSITIVE_INFINITY)).toEqual({ page: 1, pageCount: 1, start: 0, end: 25 });
  });
});

describe('pageNumbers', () => {
  it.each([
    [1, 1, [1]],
    [2, 3, [1, 2, 3]],
    [1, 9, [1, 2, 3, null, 9]],
    [3, 9, [1, 2, 3, 4, null, 9]],
    [4, 9, [1, 2, 3, 4, 5, null, 9]],
    [5, 9, [1, null, 4, 5, 6, null, 9]],
    [9, 9, [1, null, 7, 8, 9]],
  ])('page %i of %i shows %j', (page, count, expected) => {
    expect(pageNumbers(page, count)).toEqual(expected);
  });
});

describe('box stats', () => {
  it('summarises the boxes that have the feature', () => {
    const summary = summarizeFeature([{ entropy: 2 }, { entropy: 4 }, {}, { entropy: Number.NaN }], 'entropy');
    expect(summary).toEqual({ mean: 3, min: 2, max: 4, count: 2 });
    expect(summarizeFeature([{}, { hematoxylin: 1 }], 'entropy')).toBeNull();
  });

  it('normalizes into 0..1, centring when there is no range', () => {
    expect(normalize(5, 0, 10)).toBe(0.5);
    expect(normalize(-1, 0, 10)).toBe(0);
    expect(normalize(11, 0, 10)).toBe(1);
    expect(normalize(3, 3, 3)).toBe(0.5);
  });

  it('colours low values blue and high values red', () => {
    expect(heatColor(0)).toBe('hsl(220 85% 50% / 0.4)');
    expect(heatColor(1)).toBe('hsl(0 85% 50% / 0.4)');
  });

  it('shows fewer decimals for larger values', () => {
    expect(formatFeature(1.2345)).toBe('1,23');
    expect(formatFeature(12.345)).toBe('12,3');
    expect(plain(formatFeature(12345.6))).toBe('12 346');
  });
});

describe('hotspot formatting', () => {
  it('formats physical lengths in µm or mm', () => {
    expect(formatLength(1000, 0.25)).toBe('250 µm');
    expect(formatLength(5000, 0.25)).toBe('1,25 mm');
  });

  it('adds the physical size only when the resolution is known', () => {
    expect(formatSquareSize(3000, 0.25)).toBe('3000 × 3000 px · 750 µm');
    expect(plain(formatSquareSize(30000, null))).toBe('30 000 × 30 000 px');
  });
});

describe('folders and sorting', () => {
  const folder = (id: string, organization_id: number): HotspotFolder => ({
    id,
    name: id,
    organization_id,
    hotspot_count: 0,
    created_at: '2026-01-01T00:00:00Z',
  });
  const folders = [folder('a', 1), folder('b', 2), folder('c', 1)];

  it('offers only folders of the same organization', () => {
    expect(sameOrganizationFolders(folders, 'a').map((f) => f.id)).toEqual(['a', 'c']);
    expect(sameOrganizationFolders(folders, 'unknown')).toBe(folders);
  });

  it('offers each mode its own sorts', () => {
    const assess = sortOptionsFor('assess').map((option) => option.value);
    const reannotate = sortOptionsFor('reannotate').map((option) => option.value);
    const uncertainty = ['model_uncertainty', 'outline_uncertainty', 'class_uncertainty'];
    expect(reannotate).toEqual(['score', 'created_at', 'disagreement', ...uncertainty, 'cell_count']);
    expect(assess).not.toContain('score');
    expect(assess).toContain('created_at');
    expect(assess).toEqual(expect.arrayContaining(uncertainty));
  });
});

describe('last folder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('remembers the last folder in this browser', () => {
    expect(readLastFolderId()).toBeNull();
    rememberLastFolderId('f-1');
    expect(readLastFolderId()).toBe('f-1');
  });

  it('works without storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => rememberLastFolderId('f-1')).not.toThrow();
    expect(readLastFolderId()).toBeNull();
  });
});
