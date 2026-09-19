import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { browseStorage, storageQueryKeys } from '../../../services/storageApi';
import type { StorageObject } from '../../../types/storage';
import { getErrorMessage } from '../../../utils/errors';

/** Browses one prefix ("folder") of the object storage bucket, paging in more objects on demand. */
export function useStorageBrowser(prefix: string) {
  const query = useQuery({
    queryKey: storageQueryKeys.browse(prefix),
    queryFn: ({ signal }) => browseStorage(prefix, undefined, signal),
  });

  // Objects/token loaded via "load more", on top of the query's first page. Reset when `prefix`
  // changes (during render, not an effect: this is a plain prop-driven state reset).
  const [renderedPrefix, setRenderedPrefix] = useState(prefix);
  const [extraObjects, setExtraObjects] = useState<StorageObject[]>([]);
  const [extraToken, setExtraToken] = useState<string | null>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  if (prefix !== renderedPrefix) {
    setRenderedPrefix(prefix);
    setExtraObjects([]);
    setExtraToken(undefined);
    setLoadMoreError(null);
  }

  const objects = [...(query.data?.objects ?? []), ...extraObjects];
  const nextToken = extraToken !== undefined ? extraToken : (query.data?.next_token ?? null);

  const loadMore = async () => {
    if (!nextToken) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await browseStorage(prefix, nextToken);
      setExtraObjects((current) => [...current, ...page.objects]);
      setExtraToken(page.next_token);
    } catch (error) {
      setLoadMoreError(getErrorMessage(error, 'Nie udało się wczytać kolejnych plików.'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    prefixes: query.data?.prefixes ?? [],
    objects,
    hasMore: nextToken !== null,
    isLoadingMore,
    loadMoreError,
    loadMore: () => void loadMore(),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
