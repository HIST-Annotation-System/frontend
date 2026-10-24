import type { Hotspot, HotspotSort, HotspotStatus, SortOrder } from '../../../types/hotspot';
import { sortOptionsFor } from './hotspotSort';

/** Browse the catalog, assess (tag) untagged hotspots, or reannotate tagged ones. */
export type HotspotMode = 'browse' | 'assess' | 'reannotate';

/** The `folder` URL value that lists every folder. */
export const ALL_FOLDERS = 'all';
/** The `status` URL value that lists every status (the modes default to one). */
const ANY_STATUS = 'all';

const MODE_PARAM = 'mode';
const FOLDER_PARAM = 'folder';
const SORT_PARAM = 'sort';
const ORDER_PARAM = 'order';
const STATUS_PARAM = 'status';
const TAGS_PARAM = 'tags';

interface ModeDefaults {
  sort: HotspotSort;
  order: SortOrder;
  status: HotspotStatus | null;
  /** List every folder rather than the first one. */
  allFolders: boolean;
}

/** A mode only presets the catalog: every sort and filter stays available. */
const MODE_DEFAULTS: Record<HotspotMode, ModeDefaults> = {
  browse: { sort: 'created_at', order: 'desc', status: null, allFolders: true },
  assess: { sort: 'created_at', order: 'desc', status: 'untagged', allFolders: true },
  reannotate: { sort: 'score', order: 'desc', status: 'to_reannotate', allFolders: true },
};

export const HOTSPOT_MODES: { value: HotspotMode; label: string; description: string }[] = [
  { value: 'browse', label: 'Przeglądaj', description: 'Cały katalog: wgrywanie, zmiana nazw, przenoszenie.' },
  { value: 'assess', label: 'Oceniaj', description: 'Nieocenione hotspoty: ustaw priorytet, poprawność i tagi.' },
  {
    value: 'reannotate',
    label: 'Reannotuj',
    description: 'Ocenione hotspoty od najwyższego wyniku tagów: popraw anotacje i oznacz jako poprawione.',
  },
];

export const HOTSPOT_STATUS_OPTIONS: { value: HotspotStatus; label: string }[] = [
  { value: 'untagged', label: 'Nieocenione' },
  { value: 'to_reannotate', label: 'Do reannotacji' },
  { value: 'reannotated', label: 'Poprawione' },
];

/** The catalog's state, kept in the URL so the viewer can walk the same list. */
export interface CatalogParams {
  mode: HotspotMode;
  /** A folder id; `ALL_FOLDERS` or null lists every folder. */
  folder: string | null;
  sort: HotspotSort;
  order: SortOrder;
  /** null: any status. */
  status: HotspotStatus | null;
  tagIds: number[];
}

const parseMode = (value: string | null): HotspotMode =>
  HOTSPOT_MODES.find((option) => option.value === value)?.value ?? 'browse';

const parseStatus = (value: string | null, fallback: HotspotStatus | null): HotspotStatus | null => {
  if (value === ANY_STATUS) return null;
  return HOTSPOT_STATUS_OPTIONS.find((option) => option.value === value)?.value ?? fallback;
};

const parseTagIds = (value: string | null): number[] =>
  (value ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

/**
 * Missing, unknown or (for the mode) unavailable values fall back to the mode's defaults. Assessing always lists
 * the untagged hotspots, so it takes no status or tag filter.
 */
export function readCatalogParams(params: URLSearchParams): CatalogParams {
  const mode = parseMode(params.get(MODE_PARAM));
  const defaults = MODE_DEFAULTS[mode];
  const order = params.get(ORDER_PARAM);
  const assessing = mode === 'assess';
  return {
    mode,
    folder: params.get(FOLDER_PARAM),
    sort: sortOptionsFor(mode).find((option) => option.value === params.get(SORT_PARAM))?.value ?? defaults.sort,
    order: order === 'asc' || order === 'desc' ? order : defaults.order,
    status: assessing ? defaults.status : parseStatus(params.get(STATUS_PARAM), defaults.status),
    tagIds: assessing ? [] : parseTagIds(params.get(TAGS_PARAM)),
  };
}

/** Where the hotspot is in the review (mirrors the API's status filter). */
export function hotspotStatus(hotspot: Pick<Hotspot, 'tags' | 'reannotated_at'>): HotspotStatus {
  if (hotspot.reannotated_at !== null) return 'reannotated';
  const dimensions = new Set(hotspot.tags.map((tag) => tag.dimension));
  return dimensions.has('importance') && dimensions.has('accuracy') ? 'to_reannotate' : 'untagged';
}

/** A freshly opened mode: its presets, every folder, no tag filter. */
export function catalogDefaults(mode: HotspotMode): CatalogParams {
  const { sort, order, status } = MODE_DEFAULTS[mode];
  return { mode, folder: null, sort, order, status, tagIds: [] };
}

/** URL search params for the catalog state; the mode's defaults are left out. */
export function writeCatalogParams({ mode, folder, sort, order, status, tagIds }: CatalogParams): Record<string, string> {
  const defaults = MODE_DEFAULTS[mode];
  const params: Record<string, string> = {};
  if (mode !== 'browse') params[MODE_PARAM] = mode;
  if (folder !== null) params[FOLDER_PARAM] = folder;
  if (sort !== defaults.sort) params[SORT_PARAM] = sort;
  if (order !== defaults.order) params[ORDER_PARAM] = order;
  if (status !== defaults.status) params[STATUS_PARAM] = status ?? ANY_STATUS;
  if (tagIds.length > 0) params[TAGS_PARAM] = tagIds.join(',');
  return params;
}

/** The folder to list (null: every folder); `defaultFolderId` stands in for a mode set to start on one folder. */
export function resolveFolderId({ mode, folder }: CatalogParams, defaultFolderId: string | null): string | null {
  if (folder === ALL_FOLDERS) return null;
  if (folder !== null) return folder;
  return MODE_DEFAULTS[mode].allFolders ? null : defaultFolderId;
}
