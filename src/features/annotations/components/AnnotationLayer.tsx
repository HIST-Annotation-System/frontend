import { OpenSeadragonAnnotator, UserSelectAction } from '@annotorious/react';
import '@annotorious/react/annotorious-react.css';
import { useMemo, type ReactNode } from 'react';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import type { Offset } from '../../../types/geometry';
import { useAnnotations } from '../hooks/useAnnotations';
import type { ToolMode } from '../hooks/useAnnotationTool';
import { useAnnotoriousSync } from '../hooks/useAnnotoriousSync';
import { createAnnotationAdapter } from '../utils/annotationAdapter';
import { createAnnotationStyle, FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';

interface AnnotationLayerProps {
  owner: AnnotationOwner;
  /** Viewer image coordinates + offset = the owner's annotation coordinates (zero for a hotspot image). */
  imageOffset: Offset;
  classes: AnnotationClass[];
  mode: ToolMode;
  activeClassId: string | null;
  onError: (message: string) => void;
  /** The viewer the annotations are drawn on (must contain `<OpenSeadragonViewer>`). */
  children: ReactNode;
}

/** Polygon annotation layer on top of the OpenSeadragon viewer (a slide or a hotspot), synchronised with the API. */
export default function AnnotationLayer({
  owner,
  imageOffset,
  classes,
  mode,
  activeClassId,
  onError,
  children,
}: AnnotationLayerProps) {
  const { data: annotations } = useAnnotations(owner);
  useAnnotoriousSync({ owner, annotations, activeClassId, onError });

  const { x, y } = imageOffset;
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
