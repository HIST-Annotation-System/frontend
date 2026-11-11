import type { Agreement, AgreementSettings } from '../types/reannotation';
import { hotspotQueryKeys } from './hotspotsApi';
import { httpClient } from './httpClient';

// Under the hotspots' key, so whatever refreshes the hotspots refreshes their agreement too.
export const reannotationQueryKeys = {
  agreement: (hotspotId: string) => [...hotspotQueryKeys.all, 'agreement', hotspotId] as const,
  settings: (organizationId?: number) => ['agreement-settings', organizationId ?? null] as const,
};

export const getAgreement = async (hotspotId: string, signal?: AbortSignal): Promise<Agreement> =>
  (await httpClient.get<Agreement>(`/hotspots/${hotspotId}/agreement`, { signal })).data;

/** Gives the user a layer of their own, copied from the model's cells. */
export const startReannotation = async (hotspotId: string): Promise<Agreement> =>
  (await httpClient.post<Agreement>(`/hotspots/${hotspotId}/reannotation`)).data;

export const confirmReannotation = async (hotspotId: string): Promise<Agreement> =>
  (await httpClient.put<Agreement>(`/hotspots/${hotspotId}/reannotation/confirmation`)).data;

export const unconfirmReannotation = async (hotspotId: string): Promise<Agreement> =>
  (await httpClient.delete<Agreement>(`/hotspots/${hotspotId}/reannotation/confirmation`)).data;

export const getAgreementSettings = async (organizationId?: number): Promise<AgreementSettings> =>
  (await httpClient.get<AgreementSettings>('/agreement-settings', { params: { organization_id: organizationId } }))
    .data;

export const updateAgreementSettings = async (
  settings: AgreementSettings,
  organizationId?: number,
): Promise<AgreementSettings> =>
  (await httpClient.put<AgreementSettings>('/agreement-settings', settings, { params: { organization_id: organizationId } }))
    .data;
