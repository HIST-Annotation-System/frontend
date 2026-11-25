import type { Slide } from '../../../types/slide';

export type SlideSortKey = 'name' | 'created_at';

/** null: the server's order (newest first). */
export type SlideSort = { key: SlideSortKey; descending: boolean } | null;

export const sortSlides = (slides: Slide[], sort: SlideSort): Slide[] =>
  sort
    ? [...slides].sort((a, b) => {
        const order = sort.key === 'name' ? a.name.localeCompare(b.name, 'pl') : a.created_at.localeCompare(b.created_at);
        return sort.descending ? -order : order;
      })
    : slides;
