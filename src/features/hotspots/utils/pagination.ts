/** One page of a list: which page it really is (clamped), how many there are, and the slice it covers. */
interface PageSlice {
  page: number;
  pageCount: number;
  /** Index of the first item on the page. */
  start: number;
  /** Index after the last item on the page. */
  end: number;
}

/**
 * A page past the end (e.g. after a filter) falls back to the last page; anything below 1 to the first. An infinite
 * page size puts everything on one page.
 */
export function pageSlice(total: number, requestedPage: number, pageSize: number): PageSlice {
  if (!Number.isFinite(pageSize)) return { page: 1, pageCount: 1, start: 0, end: total };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, end: Math.min(start + pageSize, total) };
}

/**
 * Page numbers for the pager: the first, the last, and the current one with its neighbours; null marks a gap
 * ("1 2 3 … 9", "1 … 4 5 6 … 9").
 */
export function pageNumbers(page: number, pageCount: number): (number | null)[] {
  const shown = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  // Near the ends, show three in a row rather than a gap after one number.
  if (page <= 2) [2, 3].forEach((n) => n <= pageCount && shown.add(n));
  if (page >= pageCount - 1) [pageCount - 1, pageCount - 2].forEach((n) => n >= 1 && shown.add(n));
  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) result.push(n - sorted[index - 1] === 2 ? n - 1 : null);
    result.push(n);
  });
  return result;
}
