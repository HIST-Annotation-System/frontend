import type {
  Hotspot,
  HotspotBatch,
  HotspotBatchCreate,
  HotspotFolder,
  HotspotListQuery,
  HotspotUpdate,
} from '../types/hotspot';
import type { HotspotTagsBulk } from '../types/tag';
import { apiUrl, httpClient } from './httpClient';

export const hotspotQueryKeys = {
  all: ['hotspots'] as const,
  folders: () => [...hotspotQueryKeys.all, 'folders'] as const,
  lists: () => [...hotspotQueryKeys.all, 'list'] as const,
  list: (query: HotspotListQuery) => [...hotspotQueryKeys.lists(), query] as const,
  detail: (hotspotId: string) => [...hotspotQueryKeys.all, 'detail', hotspotId] as const,
  slide: (slideId: string) => [...hotspotQueryKeys.all, 'slide', slideId] as const,
};

// Outside `hotspotQueryKeys.all`: batch progress refreshes the catalog, which must not refetch the batches again.
export const hotspotBatchQueryKeys = {
  all: ['hotspot-batches'] as const,
  list: () => [...hotspotBatchQueryKeys.all, 'list'] as const,
  detail: (batchId: string) => [...hotspotBatchQueryKeys.all, 'detail', batchId] as const,
};

export const listHotspotFolders = async (signal?: AbortSignal): Promise<HotspotFolder[]> =>
  (await httpClient.get<HotspotFolder[]>('/hotspot-folders', { signal })).data;

export const createHotspotFolder = async (name: string): Promise<HotspotFolder> =>
  (await httpClient.post<HotspotFolder>('/hotspot-folders', { name })).data;

export const renameHotspotFolder = async (folderId: string, name: string): Promise<HotspotFolder> =>
  (await httpClient.patch<HotspotFolder>(`/hotspot-folders/${folderId}`, { name })).data;

export const deleteHotspotFolder = async (folderId: string): Promise<void> => {
  await httpClient.delete(`/hotspot-folders/${folderId}`);
};

export const listHotspots = async (
  { folderId, sort, order, status, tagIds }: HotspotListQuery,
  signal?: AbortSignal,
): Promise<Hotspot[]> =>
  (
    await httpClient.get<Hotspot[]>('/hotspots', {
      params: { folder_id: folderId ?? undefined, sort, order, status: status ?? undefined, tag_ids: tagIds },
      // `tag_ids=1&tag_ids=2`, as FastAPI expects (not `tag_ids[]=1`).
      paramsSerializer: { indexes: null },
      signal,
    })
  ).data;

/** Hotspots cut out of a slide (newest first). */
export const listSlideHotspots = async (slideId: string, signal?: AbortSignal): Promise<Hotspot[]> =>
  (await httpClient.get<Hotspot[]>('/hotspots', { params: { slide_id: slideId }, signal })).data;

export const getHotspot = async (hotspotId: string, signal?: AbortSignal): Promise<Hotspot> =>
  (await httpClient.get<Hotspot>(`/hotspots/${hotspotId}`, { signal })).data;

/** Starts cutting the boxes out in the background; a retry with the same id returns the same batch. */
export const createHotspotBatch = async (payload: HotspotBatchCreate): Promise<HotspotBatch> =>
  (await httpClient.post<HotspotBatch>('/hotspot-batches', payload)).data;

/** Running batches and recently failed ones. */
export const listHotspotBatches = async (signal?: AbortSignal): Promise<HotspotBatch[]> =>
  (await httpClient.get<HotspotBatch[]>('/hotspot-batches', { signal })).data;

export const getHotspotBatch = async (batchId: string, signal?: AbortSignal): Promise<HotspotBatch> =>
  (await httpClient.get<HotspotBatch>(`/hotspot-batches/${batchId}`, { signal })).data;

/** One PNG/JPEG file becomes a hotspot in the folder, named after the file. */
export const uploadHotspotImage = async (folderId: string, file: File, signal?: AbortSignal): Promise<Hotspot> => {
  const form = new FormData();
  form.append('file', file);
  return (await httpClient.post<Hotspot>(`/hotspot-folders/${folderId}/images`, form, { signal })).data;
};

export const updateHotspot = async (hotspotId: string, changes: HotspotUpdate): Promise<Hotspot> =>
  (await httpClient.patch<Hotspot>(`/hotspots/${hotspotId}`, changes)).data;

/** A core tag replaces the hotspot's tag of the same dimension. */
export const addHotspotTag = async (hotspotId: string, tagId: number): Promise<Hotspot> =>
  (await httpClient.put<Hotspot>(`/hotspots/${hotspotId}/tags/${tagId}`)).data;

export const removeHotspotTag = async (hotspotId: string, tagId: number): Promise<Hotspot> =>
  (await httpClient.delete<Hotspot>(`/hotspots/${hotspotId}/tags/${tagId}`)).data;

export const bulkTagHotspots = async (payload: HotspotTagsBulk): Promise<void> => {
  await httpClient.post('/hotspots/tags/bulk', payload);
};

export const deleteHotspot = async (hotspotId: string): Promise<void> => {
  await httpClient.delete(`/hotspots/${hotspotId}`);
};

/** The full hotspot image (PNG or JPEG); the annotation viewer shows it as a single-image tile source. */
export const getHotspotImageUrl = (hotspotId: string): string => apiUrl(`/hotspots/${hotspotId}/image`);

export const getHotspotThumbnailUrl = (hotspotId: string): string => apiUrl(`/hotspots/${hotspotId}/thumbnail`);
