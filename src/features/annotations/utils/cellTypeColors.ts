/**
 * Deterministic, high-contrast (on H&E tissue) color palette for dynamic cell-type coloring.
 * Colors are assigned in order of first use within a viewer session; the mapping is
 * held in a Map<cellTypeId, color> that lives in the component's state.
 */

export const CELL_TYPE_PALETTE: readonly string[] = [
  '#FFD60A', // yellow
  '#00E5FF', // cyan
  '#A6F000', // lime
  '#FFFFFF', // white
  '#FF8A00', // orange
  '#00C26E', // green
  '#2E6BFF', // blue
  '#FF3030', // red
  '#101010', // black
  '#A3A3A3', // grey
];

export const FALLBACK_CELL_TYPE_COLOR = '#A3A3A3';

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

/** Return the color for a given cell type id, falling back to the grey swatch. */
export function getCellTypeColor(
  colorMap: ReadonlyMap<number, string>,
  cellTypeId: number | null | undefined,
): string {
  if (cellTypeId == null) return FALLBACK_CELL_TYPE_COLOR;
  return colorMap.get(cellTypeId) ?? FALLBACK_CELL_TYPE_COLOR;
}
