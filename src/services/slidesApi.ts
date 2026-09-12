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
