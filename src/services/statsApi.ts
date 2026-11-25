import type { Stats } from '../types/stats';
import { httpClient } from './httpClient';

export const statsQueryKeys = {
  all: ['stats'] as const,
};

/** Admin only: review progress, annotator load and recent activity across the whole catalog. */
export const getStats = async (signal?: AbortSignal): Promise<Stats> =>
  (await httpClient.get<Stats>('/stats/', { signal })).data;
