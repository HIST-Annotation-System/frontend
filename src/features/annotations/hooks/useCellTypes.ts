import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cellTypeQueryKeys, cellTypesApi } from '../../../services/cellTypesApi';
import type { CellType } from '../../../types/cellType';
import type { Annotation } from '../../../types/annotation';
import { assignCellTypeColors } from '../utils/cellTypeColors';

/** Fetch all cell types, sorted by name. */
export function useCellTypes() {
  return useQuery({
    queryKey: cellTypeQueryKeys.all,
    queryFn: ({ signal }) => cellTypesApi.list(signal),
    staleTime: 30_000,
  });
}

/**
 * Manages the active cell type and its dynamic color map.
 * Colors are assigned from the palette in first-use order (per session).
 * The color map is seeded from the currently loaded annotations so that
 * existing annotations keep consistent colors across re-renders.
 */
export function useCellTypeTool(cellTypes: CellType[], annotations: Annotation[] | undefined) {
  const [activeCellTypeId, setActiveCellTypeId] = useState<number | null>(null);
  const [colorMap, setColorMap] = useState<Map<number, string>>(new Map());

  // Whenever annotations load or change, assign colors to any new cell types
  const annotationCellTypeIds = useMemo(
    () =>
      Array.from(
        new Set(
          (annotations ?? [])
            .map((a) => (a as unknown as { cell_type_id?: number }).cell_type_id)
            .filter((id): id is number => id != null),
        ),
      ),
    [annotations],
  );

  useEffect(() => {
    if (annotationCellTypeIds.length === 0) return;
    setColorMap((prev) => assignCellTypeColors(prev, annotationCellTypeIds));
  }, [annotationCellTypeIds]);

  const selectCellType = useCallback((id: number) => {
    setActiveCellTypeId(id);
    // Assign a color for the newly selected type right away (so the pending shape gets a color)
    setColorMap((prev) => assignCellTypeColors(prev, [id]));
  }, []);

  // Auto-select first cell type when the list loads (if nothing chosen yet)
  useEffect(() => {
    if (activeCellTypeId == null && cellTypes.length > 0) {
      selectCellType(cellTypes[0].id);
    }
  }, [cellTypes, activeCellTypeId, selectCellType]);

  return { activeCellTypeId, colorMap, selectCellType };
}
