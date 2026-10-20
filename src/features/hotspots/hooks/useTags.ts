import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addHotspotTag, bulkTagHotspots, hotspotQueryKeys, removeHotspotTag } from '../../../services/hotspotsApi';
import { createTag, deleteTag, listTags, tagQueryKeys, updateTag } from '../../../services/tagsApi';
import type { Hotspot } from '../../../types/hotspot';
import type { HotspotTagsBulk, TagCreate, TagUpdate } from '../../../types/tag';

export function useTags() {
  return useQuery({
    queryKey: tagQueryKeys.all,
    queryFn: ({ signal }) => listTags(signal),
  });
}

interface UpdateTagVariables {
  tagId: number;
  changes: TagUpdate;
}

/** Changes to the shared tag list; renames, weights and deletions also show in the catalog's tags and scores. */
export function useTagMutations() {
  const queryClient = useQueryClient();
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: tagQueryKeys.all });
    await queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });
  };

  const { mutateAsync: create, isPending: isCreating } = useMutation({
    mutationFn: (payload: TagCreate) => createTag(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagQueryKeys.all }),
  });
  const { mutateAsync: update, isPending: isUpdating } = useMutation({
    mutationFn: ({ tagId, changes }: UpdateTagVariables) => updateTag(tagId, changes),
    onSuccess: refreshAll,
  });
  const { mutateAsync: remove, isPending: isDeleting } = useMutation({
    mutationFn: (tagId: number) => deleteTag(tagId),
    onSuccess: refreshAll,
  });

  return { createTag: create, isCreating, updateTag: update, isUpdating, deleteTag: remove, isDeleting };
}

interface HotspotTagVariables {
  hotspotId: string;
  tagId: number;
}

/** Tagging hotspots; the hotspot's new state goes straight into its cache entry, the lists are refetched. */
export function useHotspotTagMutations() {
  const queryClient = useQueryClient();
  const applySaved = async (hotspot: Hotspot) => {
    queryClient.setQueryData(hotspotQueryKeys.detail(hotspot.id), hotspot);
    await queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.lists() });
  };

  const { mutateAsync: add, isPending: isAdding } = useMutation({
    mutationFn: ({ hotspotId, tagId }: HotspotTagVariables) => addHotspotTag(hotspotId, tagId),
    onSuccess: applySaved,
  });
  const { mutateAsync: remove, isPending: isRemoving } = useMutation({
    mutationFn: ({ hotspotId, tagId }: HotspotTagVariables) => removeHotspotTag(hotspotId, tagId),
    onSuccess: applySaved,
  });
  const { mutateAsync: bulk, isPending: isBulkTagging } = useMutation({
    mutationFn: (payload: HotspotTagsBulk) => bulkTagHotspots(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all }),
  });

  return {
    addTag: add,
    removeTag: remove,
    isTagging: isAdding || isRemoving,
    bulkTag: bulk,
    isBulkTagging,
  };
}
