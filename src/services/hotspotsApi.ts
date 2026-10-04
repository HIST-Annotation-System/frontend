import type { Hotspot, HotspotCreate, HotspotFolder, HotspotUpdate } from '../types/hotspot';
import { apiUrl, httpClient } from './httpClient';

export const hotspotQueryKeys = {
  all: ['hotspots'] as const,
  folders: () => [...hotspotQueryKeys.all, 'folders'] as const,
  lists: () => [...hotspotQueryKeys.all, 'list'] as const,
  list: (folderId: string) => [...hotspotQueryKeys.lists(), folderId] as const,
  detail: (hotspotId: string) => [...hotspotQueryKeys.all, 'detail', hotspotId] as const,
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

export const listHotspots = async (folderId: string, signal?: AbortSignal): Promise<Hotspot[]> =>
  (await httpClient.get<Hotspot[]>('/hotspots', { params: { folder_id: folderId }, signal })).data;

export const getHotspot = async (hotspotId: string, signal?: AbortSignal): Promise<Hotspot> =>
  (await httpClient.get<Hotspot>(`/hotspots/${hotspotId}`, { signal })).data;

export const createHotspot = async (payload: HotspotCreate): Promise<Hotspot> =>
  (await httpClient.post<Hotspot>('/hotspots', payload)).data;

/** One PNG/JPEG file becomes a hotspot in the folder, named after the file. */
export const uploadHotspotImage = async (folderId: string, file: File, signal?: AbortSignal): Promise<Hotspot> => {
  const form = new FormData();
  form.append('file', file);
  return (await httpClient.post<Hotspot>(`/hotspot-folders/${folderId}/images`, form, { signal })).data;
};

export const updateHotspot = async (hotspotId: string, changes: HotspotUpdate): Promise<Hotspot> =>
  (await httpClient.patch<Hotspot>(`/hotspots/${hotspotId}`, changes)).data;

export const deleteHotspot = async (hotspotId: string): Promise<void> => {
  await httpClient.delete(`/hotspots/${hotspotId}`);
};

/** The full hotspot image (PNG or JPEG); the annotation viewer shows it as a single-image tile source. */
export const getHotspotImageUrl = (hotspotId: string): string => apiUrl(`/hotspots/${hotspotId}/image`);

export const getHotspotThumbnailUrl = (hotspotId: string): string => apiUrl(`/hotspots/${hotspotId}/thumbnail`);
