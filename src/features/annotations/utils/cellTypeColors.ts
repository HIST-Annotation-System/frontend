/**
 * Deterministic, perceptually-distinct color palette for dynamic cell-type coloring.
 * Colors are assigned in order of first use within a viewer session; the mapping is
 * held in a Map<cellTypeId, color> that lives in the component's state.
 */

export const CELL_TYPE_PALETTE: readonly string[] = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#a3e635', // green-yellow
  '#fb923c', // amber-orange
  '#22d3ee', // sky
  '#c084fc', // purple
  '#4ade80', // green
  '#fbbf24', // amber
  '#f87171', // red
  '#34d399', // emerald
  '#60a5fa', // blue
  '#a78bfa', // violet-light
  '#fb7185', // rose-light
  '#2dd4bf', // teal-light
];

export const FALLBACK_CELL_TYPE_COLOR = '#94a3b8';

/**
 * Given the current map of cellTypeId → color and the full ordered list of cell type ids
 * that appear in the current annotation set, returns an updated map that assigns a palette
 * color to every cell type that doesn't yet have one.
 */
export function assignCellTypeColors(
  existing: ReadonlyMap<number, string>,
  usedIds: readonly number[],
): Map<number, string> {
  const updated = new Map(existing);
  let nextIndex = updated.size;
  for (const id of usedIds) {
    if (!updated.has(id)) {
      updated.set(id, CELL_TYPE_PALETTE[nextIndex % CELL_TYPE_PALETTE.length]);
      nextIndex++;
    }
  }
  return updated;
}

/** Return the color for a given cell type id, falling back to the slate swatch. */
export function getCellTypeColor(
  colorMap: ReadonlyMap<number, string>,
  cellTypeId: number | null | undefined,
): string {
  if (cellTypeId == null) return FALLBACK_CELL_TYPE_COLOR;
  return colorMap.get(cellTypeId) ?? FALLBACK_CELL_TYPE_COLOR;
}
