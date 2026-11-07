import { OpenSeadragonAnnotator, UserSelectAction, useSelection, type ImageAnnotation } from '@annotorious/react';
import '@annotorious/react/annotorious-react.css';
import { useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useLatest } from '../../../hooks/useLatest';
import type { AnnotationClass, AnnotationKind, AnnotationOwner, ToolMode } from '../../../types/annotation';
import type { Offset } from '../../../types/geometry';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAnnotoriousSync } from '../hooks/useAnnotoriousSync';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import { DRAWING_TOOLS, registerDrawingTools } from '../tools/drawingTools';
import { createAnnotationAdapter, getAnnotationClassId, getAnnotationKind } from '../utils/annotationAdapter';
import { layerOf } from '../utils/annotationLayers';
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
  /** Cells of these types are not drawn (excluded areas always are). */
  hiddenClassIds?: ReadonlySet<string>;
  /** Layers switched off (see `annotationLayers`): their shapes are not drawn. */
  hiddenLayers?: ReadonlySet<string>;
  /** A cell of this type was just drawn, so it has to be visible. */
  onCellDrawn?: (classId: string) => void;
  /** A shape of this kind was just drawn, so its layer has to be visible. */
  onShapeDrawn?: (kind: AnnotationKind) => void;
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
  hiddenClassIds,
  hiddenLayers,
  onCellDrawn,
  onShapeDrawn,
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

  const latestDrawing = useLatest({ activeClassId, activeKind, onCellDrawn, onShapeDrawn });
  useEffect(() => {
    if (!anno) return undefined;
    const showDrawn = () => {
      const { activeClassId: classId, activeKind: kind, onCellDrawn: notify, onShapeDrawn } = latestDrawing.current;
      onShapeDrawn?.(kind);
      if (kind === 'cell' && classId) notify?.(classId);
    };
    anno.on('createAnnotation', showDrawn);
    return () => anno.off('createAnnotation', showDrawn);
  }, [anno, latestDrawing]);

  // The layer of each saved shape; one just drawn (not saved yet) is in none, so it stays visible.
  const layers = useMemo(
    () => (hiddenLayers?.size ? new Map((annotations ?? []).map((item) => [item.id, layerOf(item)])) : null),
    [annotations, hiddenLayers],
  );
  const isHidden = useMemo(
    () => (annotation: ImageAnnotation) => {
      const layer = layers?.get(annotation.id);
      if (layer !== undefined && hiddenLayers?.has(layer)) return true;
      return (
        getAnnotationKind(annotation) !== 'excluded' && Boolean(hiddenClassIds?.has(getAnnotationClassId(annotation) ?? ''))
      );
    },
    [hiddenClassIds, hiddenLayers, layers],
  );
  const filter = useMemo(
    () =>
      hiddenClassIds?.size || hiddenLayers?.size ? (annotation: ImageAnnotation) => !isHidden(annotation) : undefined,
    [hiddenClassIds, hiddenLayers, isHidden],
  );

  // The annotator filters only when handed a filter: any shape it redraws afterwards (one that arrived, was edited or
  // was deselected) would come back on the image, so it is handed the filter again after each of those.
  useEffect(() => {
    if (anno && filter) anno.setFilter(filter);
  }, [anno, filter, annotations, selected]);

  // A shape that was just hidden can't stay selected, or its card and editor would float over nothing.
  useEffect(() => {
    if (anno && selected.some(({ annotation }) => isHidden(annotation as ImageAnnotation))) anno.cancelSelected();
  }, [anno, selected, isHidden]);

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
      filter={filter}
    >
      {children}
    </OpenSeadragonAnnotator>
  );
}
