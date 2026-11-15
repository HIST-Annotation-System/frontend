import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hotspotQueryKeys } from '../../../services/hotspotsApi';
import { getPriorityWeights, priorityWeightsQueryKey, updatePriorityWeights } from '../../../services/priorityWeightsApi';
import type { PriorityWeights } from '../../../types/priority';

export function usePriorityWeights() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: priorityWeightsQueryKey, queryFn: ({ signal }) => getPriorityWeights(signal) });
  const { mutateAsync: save, isPending: isSaving } = useMutation({
    mutationFn: (weights: PriorityWeights) => updatePriorityWeights(weights),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: priorityWeightsQueryKey });
      // The estimated priority orders the catalog, so listed hotspots may move.
      await queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });
    },
  });
  return { ...query, save, isSaving };
}
