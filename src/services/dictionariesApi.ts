import { httpClient } from './httpClient';
import type { CategoryResponse } from '../types/user';

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
};
