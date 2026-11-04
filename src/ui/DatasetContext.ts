import { createContext, useContext } from 'react';
import type { Category } from '../data/types.ts';
import type { DatasetMeta } from '../search/service.ts';

/** Dataset facts (categories, sources, totals) once the search worker has loaded them. */
export const DatasetContext = createContext<DatasetMeta | null>(null);

export function useDatasetMeta(): DatasetMeta | null {
  return useContext(DatasetContext);
}

export function useCategory(id: string): Category | undefined {
  return useDatasetMeta()?.categories.find((category) => category.id === id);
}
