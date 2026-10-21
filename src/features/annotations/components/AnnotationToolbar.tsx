import { useSelection } from '@annotorious/react';
import { MousePointer2, Pencil, Pentagon, Redo2, Spline, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ToolColumn, { ToolButton, ToolDivider } from '../../../components/ui/ToolColumn';
import type { ToolMode } from '../../../types/annotation';
import { isTextField } from '../../../utils/keyboard';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';

interface AnnotationToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
}

const TOOLS: { mode: ToolMode; key: string; label: string; icon: typeof Pentagon }[] = [
  { mode: 'navigate', key: 'V', label: 'Nawigacja i edycja', icon: MousePointer2 },
  { mode: 'polygon', key: 'P', label: 'Wielokąt (proste odcinki)', icon: Pentagon },
  { mode: 'curve', key: 'C', label: 'Krzywa (gładka krzywa przez klikane punkty)', icon: Spline },
  { mode: 'freehand', key: 'F', label: 'Odręcznie', icon: Pencil },
];

/** Tool column of the canvas: tools (V/P/C/F), undo/redo (also Ctrl+Z / Ctrl+Y); Esc cancels drawing or editing. */
export default function AnnotationToolbar({ mode, onModeChange }: AnnotationToolbarProps) {
  const anno = useSlideAnnotator();
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    if (!anno) return undefined;
    const refresh = () => setHistory({ canUndo: anno.canUndo(), canRedo: anno.canRedo() });
    anno.on('createAnnotation', refresh);
    anno.on('updateAnnotation', refresh);
    anno.on('deleteAnnotation', refresh);
    anno.on('selectionChanged', refresh);
    refresh();
    return () => {
      anno.off('createAnnotation', refresh);
      anno.off('updateAnnotation', refresh);
      anno.off('deleteAnnotation', refresh);
      anno.off('selectionChanged', refresh);
    };
  }, [anno]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextField(event.target)) return;
      if (event.key === 'Escape') {
        anno?.cancelDrawing();
        anno?.cancelSelected();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const tool = TOOLS.find((item) => item.key === event.key.toUpperCase());
      if (tool) onModeChange(tool.mode);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anno, onModeChange]);

  // The path editor deletes the selected point on Delete/Backspace anywhere in the window, also in text fields.
  useEffect(() => {
    const shieldTextFields = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && isTextField(event.target)) event.stopPropagation();
    };
    document.addEventListener('keydown', shieldTextFields);
    return () => document.removeEventListener('keydown', shieldTextFields);
  }, []);

  return (
    <ToolColumn label="Narzędzia anotacji">
      {TOOLS.map(({ mode: toolMode, key, label, icon: Icon }) => (
        <ToolButton
          key={toolMode}
          icon={<Icon size={16} />}
          label={label}
          shortcut={key}
          active={mode === toolMode}
          onClick={() => onModeChange(toolMode)}
        />
      ))}
      <ToolDivider />
      <ToolButton
        icon={<Undo2 size={16} />}
        label="Cofnij"
        shortcut="Ctrl+Z"
        disabled={!history.canUndo}
        onClick={() => anno?.undo()}
      />
      <ToolButton
        icon={<Redo2 size={16} />}
        label="Ponów"
        shortcut="Ctrl+Y"
        disabled={!history.canRedo}
        onClick={() => anno?.redo()}
      />
    </ToolColumn>
  );
}

const DRAWING_HINTS: Record<ToolMode, string> = {
  navigate: 'Nawigacja: przeciągnij, aby przesunąć; kliknij anotację, aby ją edytować',
  polygon: 'Wielokąt: klik dodaje punkt; dwuklik lub pierwszy punkt zamyka; Esc anuluje',
  curve: 'Krzywa: klik dodaje punkt; dwuklik lub pierwszy punkt zamyka i wygładza; Esc anuluje',
  freehand: 'Odręcznie: przytrzymaj i rysuj; kółko przybliża; prawy przycisk przesuwa; Esc anuluje',
};

const EDITING_HINT = 'Edycja: klik w punkt przełącza łuk / narożnik; Del usuwa punkt; Esc kończy';

/** What the active tool does, for the viewer's status bar. */
export function AnnotationHint({ mode, canDraw }: { mode: ToolMode; canDraw: boolean }) {
  const { selected } = useSelection();
  let hint = DRAWING_HINTS[mode];
  if (selected.length > 0) hint = EDITING_HINT;
  else if (mode !== 'navigate' && !canDraw) hint = 'Wybierz typ komórki, aby rysować';
  return (
    <span className="viewer-status__hint" role="status">
      {hint}
    </span>
  );
}
