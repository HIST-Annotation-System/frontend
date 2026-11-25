import { useEffect, type RefObject } from 'react';
import { useLatest } from './useLatest';

/** While a popup is open, a press outside `root` or Escape closes it. */
export function useDismiss(open: boolean, root: RefObject<HTMLElement | null>, close: () => void) {
  const latestClose = useLatest(close);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) latestClose.current();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latestClose.current();
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, root, latestClose]);
}
