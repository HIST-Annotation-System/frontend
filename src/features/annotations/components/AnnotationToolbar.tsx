import { useSelection } from '@annotorious/react';
import { Redo2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import type { AnnotationClass, ToolMode } from '../../../types/annotation';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import ToolModeToggle from './ToolModeToggle';
import { TOOL_MODES } from './toolModes';
import './AnnotationTools.css';

interface AnnotationToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  canDraw: boolean;
  /** The cell type new outlines get, shown in the hint chip. */
  activeClass?: AnnotationClass | null;
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
export default function AnnotationToolbar({ mode, onModeChange, canDraw, activeClass }: AnnotationToolbarProps) {
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
  const tool = TOOL_MODES.find((item) => item.mode === mode);

  return (
    <>
      <div className="annotation-tools" role="toolbar" aria-label="Narzędzia anotacji" aria-orientation="vertical">
        <span className="annotation-tools__label" aria-hidden="true">
          Narz.
        </span>
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
      {/* Dark chip beside the strip: the tool, the cell type it draws, and how to use it. */}
      <div className="drawing-hint" role="status">
        {tool && (
          <span className="drawing-hint__tool">
            <tool.Icon size={13} aria-hidden="true" />
            {tool.label}
          </span>
        )}
        {activeClass && mode !== 'navigate' && (
          <>
            <span className="drawing-hint__class">
              <span className="drawing-hint__swatch" style={{ background: activeClass.color }} aria-hidden="true" />
              {activeClass.name}
            </span>
            {hint && <span className="drawing-hint__dot">·</span>}
          </>
        )}
        {hint && <span className="drawing-hint__text">{hint}</span>}
      </div>
    </>
  );
}
