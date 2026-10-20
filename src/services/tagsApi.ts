import type { Tag, TagCreate, TagUpdate } from '../types/tag';
import { httpClient } from './httpClient';

export const tagQueryKeys = {
  all: ['tags'] as const,
};

/** Core tags first (importance, then accuracy; heaviest first), then the rest by name. */
export const listTags = async (signal?: AbortSignal): Promise<Tag[]> =>
  (await httpClient.get<Tag[]>('/tags/', { signal })).data;

export const createTag = async (payload: TagCreate): Promise<Tag> =>
  (await httpClient.post<Tag>('/tags/', payload)).data;

/** Admin only; core tags can only be re-weighted. */
export const updateTag = async (tagId: number, changes: TagUpdate): Promise<Tag> =>
  (await httpClient.patch<Tag>(`/tags/${tagId}`, changes)).data;

/** Admin only; also takes the tag off every hotspot. */
export const deleteTag = async (tagId: number): Promise<void> => {
  await httpClient.delete(`/tags/${tagId}`);
};
