import { OpenSeadragonAnnotator, UserSelectAction, useSelection } from '@annotorious/react';
import '@annotorious/react/annotorious-react.css';
import { useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useLatest } from '../../../hooks/useLatest';
import type { AnnotationClass, AnnotationKind, AnnotationOwner, ToolMode } from '../../../types/annotation';
import type { Offset } from '../../../types/geometry';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAnnotoriousSync } from '../hooks/useAnnotoriousSync';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import { DRAWING_TOOLS, registerDrawingTools } from '../tools/drawingTools';
import { createAnnotationAdapter } from '../utils/annotationAdapter';
import { createAnnotationStyle, FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';

interface AnnotationLayerProps {
  owner: AnnotationOwner;
  /** Viewer image coordinates + offset = the owner's annotation coordinates (zero for a hotspot image). */
  imageOffset: Offset;
  classes: AnnotationClass[];
  mode: ToolMode;
  activeClassId: string | null;
  /** `excluded`: new shapes are excluded areas (drawn without a class). */
  activeKind?: AnnotationKind;
  /** Shapes can be looked at and selected, but not drawn or edited. */
  readOnly?: boolean;
  onError: (message: string) => void;
  /** The viewer the annotations are drawn on (must contain `<OpenSeadragonViewer>`). */
  children: ReactNode;
}

/** Annotation layer on top of the OpenSeadragon viewer (a slide or a hotspot), synchronised with the API. */
export default function AnnotationLayer({
  owner,
  imageOffset,
  classes,
  mode,
  activeClassId,
  activeKind = 'cell',
  readOnly = false,
  onError,
  children,
}: AnnotationLayerProps) {
  const { data: annotations } = useAnnotations(owner);
  useAnnotoriousSync({ owner, annotations, activeClassId, activeKind, onError });

  // Layout effect: tools must be registered before <OpenSeadragonAnnotator> sets the tool.
  const anno = useSlideAnnotator();
  useLayoutEffect(() => {
    if (anno) registerDrawingTools(anno);
  }, [anno]);

  // A selected shape's editor replaces the drawing tool, so switching tools ends editing.
  useEffect(() => {
    anno?.cancelSelected();
  }, [anno, mode]);

  // Freehand shapes are drawn one after another: deselect the new one so the next stroke draws.
  const latestMode = useLatest(mode);
  useEffect(() => {
    if (!anno) return undefined;
    const deselectFreehand = () => {
      if (latestMode.current === 'freehand') anno.cancelSelected();
    };
    anno.on('createAnnotation', deselectFreehand);
    return () => anno.off('createAnnotation', deselectFreehand);
  }, [anno, latestMode]);

  // The freehand tool turns mouse navigation off; keep it on while a shape is edited (e.g. picked from the list).
  const { selected } = useSelection();
  useEffect(() => {
    if (anno && selected.length > 0) anno.viewer.setMouseNavEnabled(true);
  }, [anno, selected]);

  const { x, y } = imageOffset;
  const adapter = useMemo(() => createAnnotationAdapter({ x, y }), [x, y]);
  const style = useMemo(() => {
    const colors = new Map(classes.map((item) => [item.id, item.color]));
    return createAnnotationStyle(
      colors,
      (activeClassId && colors.get(activeClassId)) || FALLBACK_ANNOTATION_COLOR,
      activeKind,
    );
  }, [classes, activeClassId, activeKind]);

  return (
    <OpenSeadragonAnnotator
      adapter={adapter}
      tool={DRAWING_TOOLS[mode === 'navigate' ? 'polygon' : mode]}
      drawingMode="click"
      drawingEnabled={!readOnly && mode !== 'navigate' && (activeKind === 'excluded' || activeClassId !== null)}
      userSelectAction={readOnly ? UserSelectAction.SELECT : UserSelectAction.EDIT}
      style={style}
    >
      {children}
    </OpenSeadragonAnnotator>
  );
}
