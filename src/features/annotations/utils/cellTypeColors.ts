/**
 * Deterministic, perceptually-distinct color palette for dynamic cell-type coloring.
 * Colors are assigned in order of first use within a viewer session; the mapping is
 * held in a Map<cellTypeId, color> that lives in the component's state.
 */

export const CELL_TYPE_PALETTE: readonly string[] = [
  // Hues that stay visible on pink/purple H&E tissue: no magenta or violet, and no pure yellow
  // (yellow marks the selected shape).
  '#3ddc97', // mint
  '#22c3e6', // cyan
  '#ff8c42', // orange
  '#4d9de0', // blue
  '#f2f2f2', // white
  '#b5e655', // lime
  '#2ec4b6', // teal
  '#ff9f1c', // amber
  '#6f8cff', // cornflower
  '#00e0c6', // aqua
  '#9be564', // green
  '#7fd1ff', // sky
];

export const FALLBACK_CELL_TYPE_COLOR = '#9a9a9a';

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

/** Return the color for a given cell type id, falling back to neutral grey. */
export function getCellTypeColor(
  colorMap: ReadonlyMap<number, string>,
  cellTypeId: number | null | undefined,
): string {
  if (cellTypeId == null) return FALLBACK_CELL_TYPE_COLOR;
  return colorMap.get(cellTypeId) ?? FALLBACK_CELL_TYPE_COLOR;
}
