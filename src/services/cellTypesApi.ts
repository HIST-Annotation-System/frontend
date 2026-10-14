import { httpClient } from './httpClient';
import type { CellType } from '../types/cellType';

export const cellTypeQueryKeys = {
  all: ['cell-types'] as const,
};

export const cellTypesApi = {
  list: async (signal?: AbortSignal): Promise<CellType[]> => {
    const res = await httpClient.get<CellType[]>('/cell-types/', { signal });
    return res.data;
  },

  create: async (name: string): Promise<CellType> => {
    const res = await httpClient.post<CellType>('/cell-types/', { name });
    return res.data;
  },

  update: async (id: number, name: string): Promise<CellType> => {
    const res = await httpClient.put<CellType>(`/cell-types/${id}`, { name });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`/cell-types/${id}`);
  },
};
