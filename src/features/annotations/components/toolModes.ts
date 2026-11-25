import { MousePointer2, Pencil, Pentagon, Spline, type LucideIcon } from 'lucide-react';
import type { ToolMode } from '../../../types/annotation';

/** Canvas tools in strip order, with their names and icons. */
export const TOOL_MODES: { mode: ToolMode; label: string; title: string; Icon: LucideIcon }[] = [
  { mode: 'navigate', label: 'Nawigacja', title: 'Nawigacja i edycja', Icon: MousePointer2 },
  { mode: 'polygon', label: 'Poligon', title: 'Poligon (proste odcinki)', Icon: Pentagon },
  { mode: 'curve', label: 'Krzywa', title: 'Krzywa (gładka krzywa przez klikane punkty)', Icon: Spline },
  { mode: 'freehand', label: 'Rysowanie ręczne', title: 'Rysowanie ręczne', Icon: Pencil },
];
