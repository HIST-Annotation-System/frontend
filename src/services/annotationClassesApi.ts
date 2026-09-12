import type { AnnotationClass } from '../types/annotation';
import { httpClient } from './httpClient';

export const annotationClassQueryKeys = {
  all: ['annotation-classes'] as const,
};

export const listAnnotationClasses = async (signal?: AbortSignal): Promise<AnnotationClass[]> =>
  (await httpClient.get<AnnotationClass[]>('/annotation-classes', { signal })).data;
