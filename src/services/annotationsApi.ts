import type { Annotation, AnnotationCreate, AnnotationOwner, AnnotationUpdate } from '../types/annotation';
import { fetchBlob, httpClient } from './httpClient';

export const annotationQueryKeys = {
  forOwner: ({ type, id }: AnnotationOwner) => ['annotations', type, id] as const,
};

const annotationsPath = ({ type, id }: AnnotationOwner) => `/${type}/${id}/annotations`;

export const listAnnotations = async (owner: AnnotationOwner, signal?: AbortSignal): Promise<Annotation[]> =>
  (await httpClient.get<Annotation[]>(annotationsPath(owner), { signal })).data;

export const createAnnotation = async (owner: AnnotationOwner, payload: AnnotationCreate): Promise<Annotation> =>
  (await httpClient.post<Annotation>(annotationsPath(owner), payload)).data;

export const updateAnnotation = async (
  owner: AnnotationOwner,
  annotationId: string,
  changes: AnnotationUpdate,
): Promise<Annotation> =>
  (await httpClient.patch<Annotation>(`${annotationsPath(owner)}/${annotationId}`, changes)).data;

export const deleteAnnotation = async (owner: AnnotationOwner, annotationId: string): Promise<void> => {
  await httpClient.delete(`${annotationsPath(owner)}/${annotationId}`);
};

/** GeoJSON FeatureCollection with QuPath-style properties. */
export const fetchAnnotationsGeoJson = (owner: AnnotationOwner): Promise<Blob> =>
  fetchBlob(`${annotationsPath(owner)}/export`);
