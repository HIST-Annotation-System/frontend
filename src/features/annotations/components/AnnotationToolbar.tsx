import { useSelection } from '@annotorious/react';
import { Redo2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import FloatingToolbar from '../../../components/ui/FloatingToolbar';
import type { ToolMode } from '../../../types/annotation';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import ToolModeToggle from './ToolModeToggle';
import './AnnotationTools.css';

interface AnnotationToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  canDraw: boolean;
}

const DRAWING_HINTS: Record<ToolMode, string | null> = {
  navigate: null,
  polygon: 'Klik dodaje punkt · dwuklik lub pierwszy punkt zamyka · Esc anuluje',
  curve: 'Klik dodaje punkt krzywej · dwuklik lub pierwszy punkt zamyka i wygładza · Esc anuluje',
  freehand: 'Przytrzymaj i rysuj · kółko przybliża · prawy przycisk przesuwa · Esc anuluje',
};

const EDITING_HINT = 'Klik w punkt: łuk / narożnik · Del usuwa zaznaczony punkt · Esc kończy edycję';

const NO_CLASS_HINT = 'Wybierz typ komórki, aby rysować';

const isTextField = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Tool strip on the canvas: tools, undo/redo (also Ctrl+Z / Ctrl+Y), hints; Esc cancels drawing or editing. */
export default function AnnotationToolbar({ mode, onModeChange, canDraw }: AnnotationToolbarProps) {
  const anno = useSlideAnnotator();
  const { selected } = useSelection();
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
    if (!anno) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isTextField(event.target)) return;
      anno.cancelDrawing();
      anno.cancelSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anno]);

  // The path editor deletes the selected point on Delete/Backspace anywhere in the window, also in text fields.
  useEffect(() => {
    const shieldTextFields = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && isTextField(event.target)) event.stopPropagation();
    };
    document.addEventListener('keydown', shieldTextFields);
    return () => document.removeEventListener('keydown', shieldTextFields);
  }, []);

  const drawingHint = DRAWING_HINTS[mode] && !canDraw ? NO_CLASS_HINT : DRAWING_HINTS[mode];
  const hint = selected.length > 0 ? EDITING_HINT : drawingHint;

  return (
    <>
      {hint && (
        <p className="drawing-hint" role="status">
          {hint}
        </p>
      )}
      <FloatingToolbar label="Narzędzia anotacji">
        <ToolModeToggle mode={mode} onChange={onModeChange} />
        <Button
          icon={<Undo2 size={16} />}
          title="Cofnij (Ctrl+Z)"
          aria-label="Cofnij"
          disabled={!history.canUndo}
          onClick={() => anno?.undo()}
        />
        <Button
          icon={<Redo2 size={16} />}
          title="Ponów (Ctrl+Y)"
          aria-label="Ponów"
          disabled={!history.canRedo}
          onClick={() => anno?.redo()}
        />
      </FloatingToolbar>
    </>
  );
}
