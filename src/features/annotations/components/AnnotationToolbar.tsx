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
}

/** Tool strip on the canvas: navigate/draw, undo/redo (also Ctrl+Z / Ctrl+Y), plus drawing instructions. */
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

  return (
    <>
      {mode === 'draw' && (
        <p className="drawing-hint" role="status">
          Dwuklik lub pierwszy punkt zamyka · Esc anuluje
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
