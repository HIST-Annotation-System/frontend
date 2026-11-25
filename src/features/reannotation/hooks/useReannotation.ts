import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { annotationQueryKeys } from '../../../services/annotationsApi';
import { hotspotQueryKeys } from '../../../services/hotspotsApi';
import {
  confirmReannotation,
  getAgreement,
  getAgreementSettings,
  reannotationQueryKeys,
  startReannotation,
  unconfirmReannotation,
  updateAgreementSettings,
} from '../../../services/reannotationApi';
import type { AgreementSettings } from '../../../types/reannotation';

/** The full agreement of a hotspot; fetched while `enabled` (a dialog is open). */
export function useAgreement(hotspotId: string, enabled: boolean) {
  return useQuery({
    queryKey: reannotationQueryKeys.agreement(hotspotId),
    queryFn: ({ signal }) => getAgreement(hotspotId, signal),
    enabled,
  });
}

/**
 * Start, confirm and take back one's own reannotation. Each refreshes the hotspots (their status and figures follow);
 * starting also loads the layer it just copied.
 */
export function useReannotationActions(hotspotId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });

  const { mutateAsync: start, isPending: isStarting } = useMutation({
    mutationFn: () => startReannotation(hotspotId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: annotationQueryKeys.forOwner({ type: 'hotspots', id: hotspotId }),
      });
      await refresh();
    },
  });
  const { mutateAsync: confirm, isPending: isConfirming } = useMutation({
    // In the annotations' queue, so edits still on their way are saved before the layer is locked.
    scope: { id: annotationQueryKeys.forOwner({ type: 'hotspots', id: hotspotId }).join('/') },
    mutationFn: () => confirmReannotation(hotspotId),
    onSuccess: refresh,
  });
  const { mutateAsync: unconfirm, isPending: isUnconfirming } = useMutation({
    mutationFn: () => unconfirmReannotation(hotspotId),
    onSuccess: refresh,
  });

  return { start, confirm, unconfirm, isPending: isStarting || isConfirming || isUnconfirming };
}

/** The organization's threshold; the system admin names the organization. */
export function useAgreementSettings(organizationId?: number, enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: reannotationQueryKeys.settings(organizationId),
    queryFn: () => getAgreementSettings(organizationId),
    enabled,
  });
  const { mutateAsync: save, isPending: isSaving } = useMutation({
    mutationFn: (settings: AgreementSettings) => updateAgreementSettings(settings, organizationId),
    onSuccess: async (saved) => {
      queryClient.setQueryData(reannotationQueryKeys.settings(organizationId), saved);
      await queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });
    },
  });
  return { ...query, save, isSaving };
}
