import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSlide, renameSlide, slideQueryKeys } from '../../../services/slidesApi';
import { cancelUpload } from '../../../services/uploadApi';
import type { Slide } from '../../../types/slide';
import { isSlideGone, isSlideModified } from '../utils/slideConflicts';

interface RenameVariables {
  slideId: string;
  name: string;
  /** The version the user was looking at when they started the edit. */
  version: string;
}

interface DeleteVariables {
  slideId: string;
  version: string;
}

/** Rename/delete for the slide library, guarded against concurrent edits by other users.
 *
 * Success updates the list from the cache without a refetch; a conflict (409) refetches it so the user
 * sees what changed, and "already gone" (404) drops the slide from it.
 */
export function useSlideMutations() {
  const queryClient = useQueryClient();

  const dropFromList = (slideId: string) =>
    queryClient.setQueryData<Slide[]>(slideQueryKeys.list(), (current) =>
      current?.filter((slide) => slide.id !== slideId),
    );

  const reconcile = (error: unknown, slideId: string) => {
    if (isSlideGone(error)) dropFromList(slideId);
    if (isSlideModified(error) || isSlideGone(error)) {
      void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
    }
  };

  const { mutateAsync: rename, isPending: isRenaming } = useMutation({
    mutationFn: ({ slideId, name, version }: RenameVariables) => renameSlide(slideId, name, version),
    onSuccess: (saved) => {
      queryClient.setQueryData<Slide[]>(slideQueryKeys.list(), (current) =>
        current?.map((slide) => (slide.id === saved.id ? saved : slide)),
      );
    },
    onError: (error, { slideId }) => reconcile(error, slideId),
  });

  const { mutateAsync: remove, isPending: isDeleting } = useMutation({
    mutationFn: ({ slideId, version }: DeleteVariables) => deleteSlide(slideId, version),
    onSuccess: (_result, { slideId }) => dropFromList(slideId),
    onError: (error, { slideId }) => reconcile(error, slideId),
  });

  const { mutateAsync: cancel, isPending: isCancelling } = useMutation({
    mutationFn: (slideId: string) => cancelUpload(slideId),
    onSuccess: (_result, slideId) => dropFromList(slideId),
    onError: (error, slideId) => {
      reconcile(error, slideId);
      void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
    },
  });

  return {
    renameSlide: rename,
    isRenaming,
    deleteSlide: remove,
    isDeleting,
    cancelUpload: cancel,
    isCancelling,
  };
}
