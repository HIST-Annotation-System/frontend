import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { addHotspotTag, bulkTagHotspots, hotspotQueryKeys, removeHotspotTag } from '../../../services/hotspotsApi';
import { createTag, deleteTag, listTags, tagQueryKeys, updateTag } from '../../../services/tagsApi';
import type { Hotspot } from '../../../types/hotspot';
import type { HotspotTagsBulk, Tag, TagCreate, TagUpdate } from '../../../types/tag';
import { TAG_DIMENSIONS } from '../utils/hotspotTags';

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

/** A hotspot's tags in the server's order: core tags by dimension, then the custom ones by name. */
const orderTags = (tags: Tag[]): Tag[] => [
  ...TAG_DIMENSIONS.flatMap(({ value }) => tags.filter((tag) => tag.dimension === value)),
  ...tags.filter((tag) => tag.dimension === null).sort((a, b) => a.name.localeCompare(b.name)),
];

/**
 * Tagging hotspots. A change shows at once (the hotspot's cache entry is updated before the request), the requests
 * run one after another in the background, so quick clicks reach the server in order and never block the buttons.
 * Only the last pending answer replaces the cached hotspot (with its new score), so it never undoes a newer click;
 * after a failure the hotspot is fetched again. The catalog lists are refreshed without waiting for them.
 */
export function useHotspotTagMutations() {
  const queryClient = useQueryClient();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingCount = useRef(0);
  const [pending, setPending] = useState(0);

  const change = (
    { hotspotId, tagId }: HotspotTagVariables,
    present: boolean,
    request: (hotspotId: string, tagId: number) => Promise<Hotspot>,
  ): Promise<Hotspot> => {
    const detailKey = hotspotQueryKeys.detail(hotspotId);
    void queryClient.cancelQueries({ queryKey: detailKey });
    const tag = queryClient.getQueryData<Tag[]>(tagQueryKeys.all)?.find((item) => item.id === tagId);
    queryClient.setQueryData<Hotspot>(detailKey, (hotspot) => {
      if (!hotspot) return hotspot;
      // A core tag replaces the hotspot's tag of the same dimension, as on the server.
      const kept = hotspot.tags.filter(
        (item) => item.id !== tagId && !(present && tag?.dimension && item.dimension === tag.dimension),
      );
      const tags = orderTags(present && tag ? [...kept, tag] : kept);
      // The score is the sum of the tags' weights, as the server computes it.
      return { ...hotspot, tags, score: tags.reduce((sum, item) => sum + item.weight, 0) };
    });

    pendingCount.current += 1;
    setPending(pendingCount.current);
    const settle = () => {
      pendingCount.current -= 1;
      setPending(pendingCount.current);
    };
    const run = queue.current.then(() => request(hotspotId, tagId));
    queue.current = run.catch(() => undefined);
    return run.then(
      (saved) => {
        settle();
        if (pendingCount.current === 0) queryClient.setQueryData(detailKey, saved);
        void queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.lists(), refetchType: 'active' });
        return saved;
      },
      (error: unknown) => {
        settle();
        void queryClient.invalidateQueries({ queryKey: detailKey });
        throw error;
      },
    );
  };

  const add = (variables: HotspotTagVariables) => change(variables, true, addHotspotTag);
  const remove = (variables: HotspotTagVariables) => change(variables, false, removeHotspotTag);
  const { mutateAsync: bulk, isPending: isBulkTagging } = useMutation({
    mutationFn: (payload: HotspotTagsBulk) => bulkTagHotspots(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all }),
  });

  return {
    addTag: add,
    removeTag: remove,
    isTagging: pending > 0,
    bulkTag: bulk,
    isBulkTagging,
  };
}
