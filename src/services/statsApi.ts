import type { Stats } from '../types/stats';
import { httpClient } from './httpClient';

export const statsQueryKeys = {
  all: ['stats'] as const,
  /** null: every organization (system admin), or the user's own (an organization's admin). */
  scope: (organizationId: number | null) => [...statsQueryKeys.all, organizationId] as const,
};

/**
 * Review progress, annotator load and recent activity. An organization's admin gets their organization; the system
 * admin the whole catalog, or one organization when `organizationId` is given.
 */
export const getStats = async (organizationId: number | null, signal?: AbortSignal): Promise<Stats> =>
  (
    await httpClient.get<Stats>('/stats/', {
      params: organizationId === null ? undefined : { organization_id: organizationId },
      signal,
    })
  ).data;
