import { useSelection } from '@annotorious/react';
import { Redo2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import type { ToolMode } from '../../../types/annotation';
import ViewerHint from '../../viewer/components/ViewerHint';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import ToolModeToggle from './ToolModeToggle';
import './AnnotationTools.css';

interface AnnotationToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  /** A cell type is chosen, so the drawing tools can draw. */
  canDraw: boolean;
}

/** What each tool does, for the status bar (as the tools work: see tools/ and AnnotationLayer). */
const TOOL_HINTS: Record<ToolMode, string> = {
  navigate: 'Nawigacja: klik zaznacza obrys; przeciągnij, aby przesunąć; kółko przybliża',
  polygon: 'Poligon: klik dodaje punkt; dwuklik lub klik w pierwszy punkt zamyka; Esc anuluje',
  curve: 'Krzywa: klik dodaje punkt; dwuklik lub klik w pierwszy punkt zamyka gładką krzywą; Esc anuluje',
  freehand: 'Rysowanie ręczne: przeciągnij, aby narysować obrys; prawy przycisk przesuwa; Esc anuluje',
};
const EDIT_HINT = 'Edycja: przeciągaj punkty; Delete usuwa zaznaczony punkt; Esc kończy edycję';
const NO_CLASS_HINT = 'Wybierz typ komórki po prawej, aby rysować';

const isTextField = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Tool strip on the canvas: tools, undo/redo (also Ctrl+Z / Ctrl+Y); Esc cancels drawing or editing. */
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

  const hint =
    selected.length > 0 ? EDIT_HINT : mode !== 'navigate' && !canDraw ? NO_CLASS_HINT : TOOL_HINTS[mode];

  return (
    <>
      <ViewerHint text={hint} />
      <div className="tool-column annotation-tools" role="toolbar" aria-label="Narzędzia anotacji" aria-orientation="vertical">
        <ToolModeToggle mode={mode} onChange={onModeChange} />
        <span className="annotation-tools__divider" aria-hidden="true" />
        <Button
          icon={<Undo2 size={17} />}
          title="Cofnij (Ctrl+Z)"
          aria-label="Cofnij"
          disabled={!history.canUndo}
          onClick={() => anno?.undo()}
        />
        <Button
          icon={<Redo2 size={17} />}
          title="Ponów (Ctrl+Y)"
          aria-label="Ponów"
          disabled={!history.canRedo}
          onClick={() => anno?.redo()}
        />
      </div>
    </>
  );
}
