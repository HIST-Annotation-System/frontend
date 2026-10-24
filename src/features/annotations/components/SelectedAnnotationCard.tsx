import { useSelection } from '@annotorious/react';
import { Trash2 } from 'lucide-react';
import OpenSeadragon from 'openseadragon';
import { useLayoutEffect, useRef } from 'react';
import Button from '../../../components/ui/Button';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import { useAnnotationActions } from '../hooks/useAnnotationActions';
import { useAnnotations } from '../hooks/useAnnotations';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import { FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';
import './AnnotationTools.css';

const GAP_PX = 10;
const EDGE_PX = 12;

interface SelectedAnnotationCardProps {
  owner: AnnotationOwner;
  classes: AnnotationClass[];
  readOnly?: boolean;
  onError: (message: string) => void;
}
export default function SelectedAnnotationCard({
  owner,
  classes,
  readOnly = false,
  onError,
}: SelectedAnnotationCardProps) {
  const { data: annotations } = useAnnotations(owner);
  const { selected } = useSelection();
  const anno = useSlideAnnotator();
  const { changeClass, removeAnnotation } = useAnnotationActions(owner, onError);
  const cardRef = useRef<HTMLDivElement>(null);

  const selectedId = selected[0]?.annotation.id;
  const index = selectedId && annotations ? annotations.findIndex((annotation) => annotation.id === selectedId) : -1;
  const visible = index >= 0;

  useLayoutEffect(() => {
    if (!anno || !selectedId || !visible) return undefined;
    const { viewer } = anno;
    const { store } = anno.state;

    const follow = () => {
      const card = cardRef.current;
      const image = viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;
      const bounds = store.getAnnotation(selectedId)?.target.selector.geometry.bounds;
      if (!card || !image || !bounds) return;
      const topLeft = image.imageToViewerElementCoordinates(new OpenSeadragon.Point(bounds.minX, bounds.minY));
      const bottomRight = image.imageToViewerElementCoordinates(new OpenSeadragon.Point(bounds.maxX, bounds.maxY));
      const { x: width, y: height } = viewer.viewport.getContainerSize();
      const outOfView = bottomRight.x < 0 || bottomRight.y < 0 || topLeft.x > width || topLeft.y > height;
      card.style.visibility = outOfView ? 'hidden' : 'visible';
      if (outOfView) return;

      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;
      const above = topLeft.y - GAP_PX - cardHeight;
      const below = bottomRight.y + GAP_PX;
      const top = above >= EDGE_PX ? above : below + cardHeight <= height - EDGE_PX ? below : EDGE_PX;
      const centred = (topLeft.x + bottomRight.x) / 2 - cardWidth / 2;
      const left = Math.min(Math.max(centred, EDGE_PX), Math.max(EDGE_PX, width - cardWidth - EDGE_PX));
      card.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    };

    viewer.addHandler('update-viewport', follow);
    viewer.addHandler('resize', follow);
    store.observe(follow, { annotations: selectedId });
    follow();
    return () => {
      viewer.removeHandler('update-viewport', follow);
      viewer.removeHandler('resize', follow);
      store.unobserve(follow);
    };
  }, [anno, selectedId, visible, annotations]);

  if (!visible || !annotations) return null;

  const annotation = annotations[index];
  const color = classes.find((item) => item.id === annotation.class_id)?.color ?? FALLBACK_ANNOTATION_COLOR;

  return (
    <div ref={cardRef} className="selected-annotation" aria-label="Zaznaczona anotacja">
      <span className="annotation-item__swatch" style={{ background: color }} aria-hidden="true" />
      <span className="selected-annotation__number">#{index + 1}</span>
      <select
        className="selected-annotation__class"
        aria-label="Typ komórki zaznaczonej anotacji"
        value={annotation.class_id}
        disabled={readOnly}
        onChange={(event) => void changeClass(annotation.id, event.target.value)}
      >
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {!readOnly && (
        <Button
          variant="ghost"
          icon={<Trash2 size={14} />}
          title="Usuń obrys"
          aria-label="Usuń anotację"
          onClick={() => void removeAnnotation(annotation.id)}
        />
      )}
    </div>
  );
}
