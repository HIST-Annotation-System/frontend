import type { CellType } from '../../../types/cellType';

/** Mirrors the backend: `CELL_TYPE_NAME_MAX_LENGTH` and the 409 `code` of a taken name. */
export const CELL_TYPE_NAME_MAX_LENGTH = 128;
export const CELL_TYPE_NAME_TAKEN_CODE = 'cell_type_name_taken';

/** Trimmed, inner whitespace collapsed: the name the backend stores ("  CD8   T " → "CD8 T"). */
export const normalizeCellTypeName = (name: string): string => name.trim().split(/\s+/).join(' ');

/**
 * The cell type that already uses `name`, ignoring letter case and extra whitespace (the backend's uniqueness rule);
 * `exceptId` skips the type being renamed, so changing only its letter case is allowed.
 */
export function findCellTypeByName(
  cellTypes: readonly CellType[],
  name: string,
  exceptId?: number,
): CellType | undefined {
  const key = normalizeCellTypeName(name).toLowerCase();
  if (!key) return undefined;
  return cellTypes.find((ct) => ct.id !== exceptId && normalizeCellTypeName(ct.name).toLowerCase() === key);
}
