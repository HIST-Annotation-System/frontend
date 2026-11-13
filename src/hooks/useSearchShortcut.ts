import { useEffect, type RefObject } from 'react';

/** "/" jumps to the search box from anywhere on the page (unless typing in a field), like on most sites with a list. */
export function useSearchShortcut(input: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== '/' || target.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, [input]);
}
