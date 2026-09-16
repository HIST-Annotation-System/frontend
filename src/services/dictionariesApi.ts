import { httpClient } from './httpClient';
import type { CategoryResponse, AnnotationGroupResponse } from '../types/user';

export const dictionariesApi = {
  getCategories: async (): Promise<CategoryResponse[]> => {
    const response = await httpClient.get<CategoryResponse[]>('/categories/');
    return response.data;
  },

  createCategory: async (name: string): Promise<CategoryResponse> => {
    const response = await httpClient.post<CategoryResponse>('/categories/', { name });
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await httpClient.delete(`/categories/${id}`);
  },

  getGroups: async (): Promise<AnnotationGroupResponse[]> => {
    const response = await httpClient.get<AnnotationGroupResponse[]>('/groups/');
    return response.data;
  },

  createGroup: async (name: string): Promise<AnnotationGroupResponse> => {
    const response = await httpClient.post<AnnotationGroupResponse>('/groups/', { name });
    return response.data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await httpClient.delete(`/groups/${id}`);
  }
};
