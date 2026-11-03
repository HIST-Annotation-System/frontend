import Spinner from '../../../components/ui/Spinner';
import type { AnnotationOwner } from '../../../types/annotation';
import type { SegmentationStatus } from '../../../types/hotspot';
import { useAnnotations } from '../hooks/useAnnotations';
import './AnnotationTools.css';

interface AnnotationProgressProps {
  owner: AnnotationOwner;
  segmentationStatus: SegmentationStatus;
  /** The model has finished and its cells are on their way. */
  loadingModelCells: boolean;
}

/**
 * Says on the image why it has no outlines yet. It never blocks the canvas: annotating works meanwhile. Waiting for the
 * model gets no spinner, since it lasts until someone's worker runs, which may not be soon.
 */
export default function AnnotationProgress({ owner, segmentationStatus, loadingModelCells }: AnnotationProgressProps) {
  const { isPending } = useAnnotations(owner);

  let content = null;
  if (isPending) content = <Spinner label="Wczytywanie anotacji…" />;
  else if (loadingModelCells) content = <Spinner label="Wczytywanie predykcji modelu…" />;
  else if (segmentationStatus === 'pending') content = <span>Oczekuje na predykcje modelu</span>;
  if (!content) return null;

  return <div className="annotation-progress">{content}</div>;
}
