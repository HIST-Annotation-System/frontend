import type { Rect } from '../types/geometry';
import type { Slide, SlideDetail } from '../types/slide';
import { apiUrl, fetchBlob, httpClient } from './httpClient';

export const slideQueryKeys = {
  all: ['slides'] as const,
  list: () => [...slideQueryKeys.all, 'list'] as const,
  detail: (slideId: string) => [...slideQueryKeys.all, 'detail', slideId] as const,
};

export const listSlides = async (signal?: AbortSignal): Promise<Slide[]> =>
  (await httpClient.get<Slide[]>('/slides', { signal })).data;

export const getSlide = async (slideId: string, signal?: AbortSignal): Promise<SlideDetail> =>
  (await httpClient.get<SlideDetail>(`/slides/${slideId}`, { signal })).data;

/** `version` is the slide's version the user saw: the backend answers 409 if someone changed it since. */
const ifMatch = (version: string) => ({ 'If-Match': `"${version}"` });

export const renameSlide = async (slideId: string, name: string, version: string): Promise<Slide> =>
  (await httpClient.patch<Slide>(`/slides/${slideId}`, { name }, { headers: ifMatch(version) })).data;

export const deleteSlide = async (slideId: string, version: string): Promise<void> => {
  await httpClient.delete(`/slides/${slideId}`, { headers: ifMatch(version) });
};

/** Deep Zoom descriptor; OpenSeadragon derives the tile URLs from it. */
export const getDziUrl = (slideId: string): string => apiUrl(`/slides/${slideId}/image.dzi`);

export const getThumbnailUrl = (slideId: string): string => apiUrl(`/slides/${slideId}/thumbnail`);

export interface RegionRequest extends Rect {
  maxSize: number;
}

/** Level-0 region as PNG. */
export const fetchRegion = (slideId: string, region: RegionRequest): Promise<Blob> =>
  fetchBlob(`/slides/${slideId}/region`, {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
    max_size: region.maxSize,
  });
