import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createHotspot,
  createHotspotFolder,
  deleteHotspot,
  deleteHotspotFolder,
  getHotspot,
  hotspotQueryKeys,
  listHotspotFolders,
  listHotspots,
  renameHotspotFolder,
  updateHotspot,
} from '../../../services/hotspotsApi';
import type { HotspotCreate, HotspotSort, HotspotUpdate, SortOrder } from '../../../types/hotspot';

export function useHotspotFolders() {
  return useQuery({
    queryKey: hotspotQueryKeys.folders(),
    queryFn: ({ signal }) => listHotspotFolders(signal),
  });
}

export function useHotspots(folderId: string | null, sort: HotspotSort, order: SortOrder) {
  return useQuery({
    queryKey: hotspotQueryKeys.list(folderId ?? '', sort, order),
    queryFn: ({ signal }) => listHotspots(folderId ?? '', sort, order, signal),
    enabled: folderId !== null,
    // Keeps the current cards on screen while the same folder loads in another order (not another folder).
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === (folderId ?? '') ? previous : undefined,
  });
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
  const { mutateAsync: create, isPending: isCreating } = useMutation({
    mutationFn: (payload: HotspotCreate) => createHotspot(payload),
    onSuccess: refresh,
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
    createHotspot: create,
    isCreating,
    updateHotspot: update,
    isUpdating,
    deleteHotspot: remove,
    isDeleting,
  };
}
