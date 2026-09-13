import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSlide, renameSlide, slideQueryKeys } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';

interface RenameVariables {
  slideId: string;
  name: string;
}

/** Rename/delete for the slide library; both refresh the list from the cache without a refetch. */
export function useSlideMutations() {
  const queryClient = useQueryClient();

  const { mutateAsync: rename, isPending: isRenaming } = useMutation({
    mutationFn: ({ slideId, name }: RenameVariables) => renameSlide(slideId, name),
    onSuccess: (saved) => {
      queryClient.setQueryData<Slide[]>(slideQueryKeys.list(), (current) =>
        current?.map((slide) => (slide.id === saved.id ? saved : slide)),
      );
    },
  });

  const { mutateAsync: remove, isPending: isDeleting } = useMutation({
    mutationFn: (slideId: string) => deleteSlide(slideId),
    onSuccess: (_result, slideId) => {
      queryClient.setQueryData<Slide[]>(slideQueryKeys.list(), (current) =>
        current?.filter((slide) => slide.id !== slideId),
      );
    },
  });

  return { renameSlide: rename, isRenaming, deleteSlide: remove, isDeleting };
}
