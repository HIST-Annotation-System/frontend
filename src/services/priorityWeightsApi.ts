import type { PriorityWeights } from '../types/priority';
import { httpClient } from './httpClient';

export const priorityWeightsQueryKey = ['priority-weights'] as const;

export const getPriorityWeights = async (signal?: AbortSignal): Promise<PriorityWeights> =>
  (await httpClient.get<{ weights: PriorityWeights }>('/priority-weights/', { signal })).data.weights;

/** Admin only. */
export const updatePriorityWeights = async (weights: PriorityWeights): Promise<PriorityWeights> =>
  (await httpClient.patch<{ weights: PriorityWeights }>('/priority-weights/', { weights })).data.weights;
