import type { Hotspot, HotspotSort, SortOrder } from '../../../types/hotspot';

interface HotspotSortOption {
  value: HotspotSort;
  label: string;
  /** What a high value means, shown as the select's tooltip. */
  description: string;
}

export const HOTSPOT_SORT_OPTIONS: HotspotSortOption[] = [
  { value: 'created_at', label: 'Data dodania', description: 'Kolejność zapisania hotspotów.' },
  {
    value: 'entropy',
    label: 'Entropia',
    description: 'Entropia Shannona histogramu jasności: im wyższa, tym bardziej zróżnicowany obraz.',
  },
  {
    value: 'glcm_contrast',
    label: 'Kontrast tekstury (GLCM)',
    description: 'Kontrast macierzy współwystąpień poziomów szarości: jak bardzo różnią się sąsiednie piksele.',
  },
  {
    value: 'edge_density',
    label: 'Gęstość krawędzi',
    description: 'Średnia siła gradientu (filtr Sobela): wysoka dla drobnych, ostrych struktur.',
  },
  {
    value: 'colorfulness',
    label: 'Kolorowość',
    description: 'Miara Haslera i Süsstrunka: rozpiętość i nasycenie barw.',
  },
];

export const DEFAULT_HOTSPOT_SORT: HotspotSort = 'created_at';
export const DEFAULT_SORT_ORDER: SortOrder = 'desc';

export const parseHotspotSort = (value: string | null): HotspotSort =>
  HOTSPOT_SORT_OPTIONS.find((option) => option.value === value)?.value ?? DEFAULT_HOTSPOT_SORT;

export const parseSortOrder = (value: string | null): SortOrder =>
  value === 'asc' || value === 'desc' ? value : DEFAULT_SORT_ORDER;

/** The hotspot's value of the sorted-by feature, for display; null when sorting by date or unknown. */
export const formatSortValue = (hotspot: Hotspot, sort: HotspotSort): string | null => {
  if (sort === 'created_at') return null;
  const value = hotspot.features?.[sort];
  return value === undefined ? null : value.toFixed(2);
};
