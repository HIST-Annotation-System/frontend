import type { Annotation, AnnotationCreate, AnnotationUpdate } from '../types/annotation';
import { fetchBlob, httpClient } from './httpClient';

export const annotationQueryKeys = {
  forSlide: (slideId: string) => ['annotations', slideId] as const,
};

const annotationsPath = (slideId: string) => `/slides/${slideId}/annotations`;

export const listAnnotations = async (slideId: string, signal?: AbortSignal): Promise<Annotation[]> =>
  (await httpClient.get<Annotation[]>(annotationsPath(slideId), { signal })).data;

export const createAnnotation = async (slideId: string, payload: AnnotationCreate): Promise<Annotation> =>
  (await httpClient.post<Annotation>(annotationsPath(slideId), payload)).data;

export const updateAnnotation = async (
  slideId: string,
  annotationId: string,
  changes: AnnotationUpdate,
): Promise<Annotation> =>
  (await httpClient.patch<Annotation>(`${annotationsPath(slideId)}/${annotationId}`, changes)).data;

export const deleteAnnotation = async (slideId: string, annotationId: string): Promise<void> => {
  await httpClient.delete(`${annotationsPath(slideId)}/${annotationId}`);
};

/** GeoJSON FeatureCollection with QuPath-style properties. */
export const fetchAnnotationsGeoJson = (slideId: string): Promise<Blob> =>
  fetchBlob(`${annotationsPath(slideId)}/export`);
