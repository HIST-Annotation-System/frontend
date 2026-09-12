import { useCallback, useEffect, useState } from 'react';
import type { AnnotationClass } from '../../../types/annotation';

export type ToolMode = 'navigate' | 'draw';

/** The active tool (navigate or draw polygons) and the tissue class new polygons receive. */
export function useAnnotationTool(classes: AnnotationClass[]) {
  const [mode, setMode] = useState<ToolMode>('navigate');
  const [chosenClassId, setChosenClassId] = useState<string | null>(null);
  const activeClassId = chosenClassId ?? classes[0]?.id ?? null;

  const selectClass = useCallback((classId: string) => {
    setChosenClassId(classId);
    // As in the prototype: picking a class starts drawing.
    setMode('draw');
  }, []);

  // Esc leaves drawing mode, which also discards a polygon that is still being drawn.
  useEffect(() => {
    if (mode !== 'draw') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('navigate');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  return { mode, setMode, activeClassId, selectClass };
}
