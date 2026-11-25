import { useAnnotator, type AnnotoriousOpenSeadragonAnnotator, type ImageAnnotation } from '@annotorious/react';
import type { AnnotationDraft } from '../../../types/annotation';

/** Annotorious annotator speaking the API format (through our adapter). */
export type SlideAnnotator = AnnotoriousOpenSeadragonAnnotator<ImageAnnotation, AnnotationDraft>;

/** The annotator instance; undefined until `<OpenSeadragonAnnotator>` has created it. */
export function useSlideAnnotator(): SlideAnnotator | undefined {
  return useAnnotator<SlideAnnotator | undefined>();
}
