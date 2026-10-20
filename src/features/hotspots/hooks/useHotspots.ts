import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  createHotspotBatch,
  createHotspotFolder,
  deleteHotspot,
  deleteHotspotFolder,
  getHotspot,
  getHotspotBatch,
  hotspotBatchQueryKeys,
  hotspotQueryKeys,
  listHotspotBatches,
  listHotspotFolders,
  listHotspots,
  listSlideHotspots,
  renameHotspotFolder,
  updateHotspot,
} from '../../../services/hotspotsApi';
import type { HotspotBatch, HotspotBatchCreate, HotspotListQuery, HotspotUpdate } from '../../../types/hotspot';

const BATCH_POLL_INTERVAL_MS = 3000;

export function useHotspotFolders() {
  return useQuery({
    queryKey: hotspotQueryKeys.folders(),
    queryFn: ({ signal }) => listHotspotFolders(signal),
  });
}

export function useHotspots(query: HotspotListQuery) {
  return useQuery({
    queryKey: hotspotQueryKeys.list(query),
    queryFn: ({ signal }) => listHotspots(query, signal),
    // Keeps the current cards on screen while the same folder loads in another order or filter (not another folder).
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2].folderId === query.folderId ? previous : undefined,
  });
}

/** Hotspots already cut out of the slide (outlined on it while choosing new ones). */
export function useSlideHotspots(slideId: string) {
  return useQuery({
    queryKey: hotspotQueryKeys.slide(slideId),
    queryFn: ({ signal }) => listSlideHotspots(slideId, signal),
  });
}

/** Running and recently failed batches, polled while any is running. */
export function useHotspotBatches() {
  const query = useQuery({
    queryKey: hotspotBatchQueryKeys.list(),
    queryFn: ({ signal }) => listHotspotBatches(signal),
    refetchInterval: (current) =>
      current.state.data?.some((batch) => batch.status === 'running') ? BATCH_POLL_INTERVAL_MS : false,
    // Refetch-on-focus is off app-wide, so polling must go on in a background tab.
    refetchIntervalInBackground: true,
  });
  useRefreshOnProgress(query.data);
  return query;
}

/** One batch, polled until it has finished. */
export function useHotspotBatch(batchId: string) {
  const query = useQuery({
    queryKey: hotspotBatchQueryKeys.detail(batchId),
    queryFn: ({ signal }) => getHotspotBatch(batchId, signal),
    refetchInterval: (current) => (current.state.data?.status === 'running' ? BATCH_POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: true,
  });
  useRefreshOnProgress(query.data && [query.data]);
  return query;
}

/** Each newly cut-out hotspot refreshes the catalog (folder counts, lists, slide outlines). */
function useRefreshOnProgress(batches: HotspotBatch[] | undefined) {
  const queryClient = useQueryClient();
  const progress = batches?.map((batch) => `${batch.id}:${batch.done}:${batch.status}`).join() ?? '';
  const previous = useRef(progress);
  useEffect(() => {
    if (progress === previous.current) return;
    previous.current = progress;
    void queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });
  }, [progress, queryClient]);
}

export function useHotspot(hotspotId: string) {
  return useQuery({
    queryKey: hotspotQueryKeys.detail(hotspotId),
    queryFn: ({ signal }) => getHotspot(hotspotId, signal),
  });
}

interface RenameFolderVariables {
  folderId: string;
  name: string;
}

interface UpdateHotspotVariables {
  hotspotId: string;
  changes: HotspotUpdate;
}

/**
 * Folder and hotspot changes. Folder counts and hotspot lists depend on each other, so every change
 * refetches the whole hotspot catalog (it is small) instead of patching several cache entries.
 */
export function useHotspotMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hotspotQueryKeys.all });

  const { mutateAsync: createFolder, isPending: isCreatingFolder } = useMutation({
    mutationFn: (name: string) => createHotspotFolder(name),
    onSuccess: refresh,
  });
  const { mutateAsync: renameFolder, isPending: isRenamingFolder } = useMutation({
    mutationFn: ({ folderId, name }: RenameFolderVariables) => renameHotspotFolder(folderId, name),
    onSuccess: refresh,
  });
  const { mutateAsync: removeFolder, isPending: isDeletingFolder } = useMutation({
    mutationFn: (folderId: string) => deleteHotspotFolder(folderId),
    onSuccess: refresh,
  });
  const { mutateAsync: createBatch, isPending: isCreatingBatch } = useMutation({
    mutationFn: (payload: HotspotBatchCreate) => createHotspotBatch(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotspotBatchQueryKeys.all }),
  });
  const { mutateAsync: update, isPending: isUpdating } = useMutation({
    mutationFn: ({ hotspotId, changes }: UpdateHotspotVariables) => updateHotspot(hotspotId, changes),
    onSuccess: refresh,
  });
  const { mutateAsync: remove, isPending: isDeleting } = useMutation({
    mutationFn: (hotspotId: string) => deleteHotspot(hotspotId),
    onSuccess: refresh,
  });

  return {
    createFolder,
    isCreatingFolder,
    renameFolder,
    isRenamingFolder,
    deleteFolder: removeFolder,
    isDeletingFolder,
    createBatch,
    isCreatingBatch,
    updateHotspot: update,
    isUpdating,
    deleteHotspot: remove,
    isDeleting,
  };
}
