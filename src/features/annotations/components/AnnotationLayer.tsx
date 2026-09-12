import { OpenSeadragonAnnotator, UserSelectAction } from '@annotorious/react';
import '@annotorious/react/annotorious-react.css';
import { useMemo, type ReactNode } from 'react';
import type { AnnotationClass } from '../../../types/annotation';
import type { SlideDetail } from '../../../types/slide';
import { useAnnotations } from '../hooks/useAnnotations';
import type { ToolMode } from '../hooks/useAnnotationTool';
import { useAnnotoriousSync } from '../hooks/useAnnotoriousSync';
import { createAnnotationAdapter } from '../utils/annotationAdapter';
import { createAnnotationStyle, FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';

interface AnnotationLayerProps {
  slide: Pick<SlideDetail, 'id' | 'image_offset'>;
  classes: AnnotationClass[];
  mode: ToolMode;
  activeClassId: string | null;
  onError: (message: string) => void;
  /** The viewer the annotations are drawn on (must contain `<OpenSeadragonViewer>`). */
  children: ReactNode;
}

/** Polygon annotation layer on top of the OpenSeadragon viewer, synchronised with the API. */
export default function AnnotationLayer({ slide, classes, mode, activeClassId, onError, children }: AnnotationLayerProps) {
  const { data: annotations } = useAnnotations(slide.id);
  useAnnotoriousSync({ slideId: slide.id, annotations, activeClassId, onError });

  const { x, y } = slide.image_offset;
  const adapter = useMemo(() => createAnnotationAdapter({ x, y }), [x, y]);
  const style = useMemo(() => {
    const colors = new Map(classes.map((item) => [item.id, item.color]));
    return createAnnotationStyle(colors, (activeClassId && colors.get(activeClassId)) || FALLBACK_ANNOTATION_COLOR);
  }, [classes, activeClassId]);

  return (
    <OpenSeadragonAnnotator
      adapter={adapter}
      tool="polygon"
      drawingMode="click"
      drawingEnabled={mode === 'draw'}
      userSelectAction={UserSelectAction.EDIT}
      style={style}
    >
      {children}
    </OpenSeadragonAnnotator>
  );
}
