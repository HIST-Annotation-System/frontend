import type { HotspotFeature, HotspotSort } from '../../../types/hotspot';
import type { HotspotMode } from './hotspotReview';

export interface HotspotSortOption {
  value: HotspotSort;
  label: string;
  /** What a high value means, shown as the select's tooltip. */
  description: string;
}

/** The image stats computed on every hotspot, with a short label for cards and table headers. */
export const HOTSPOT_FEATURES: (HotspotSortOption & { value: HotspotFeature; shortLabel: string })[] = [
  {
    value: 'entropy',
    label: 'Entropia',
    shortLabel: 'Entropia',
    description: 'Entropia Shannona histogramu jasności: im wyższa, tym bardziej zróżnicowany obraz.',
  },
  {
    value: 'glcm_contrast',
    label: 'Kontrast tekstury (GLCM)',
    shortLabel: 'GLCM',
    description: 'Kontrast macierzy współwystąpień poziomów szarości: jak bardzo różnią się sąsiednie piksele.',
  },
  {
    value: 'edge_density',
    label: 'Gęstość krawędzi',
    shortLabel: 'Krawędzie',
    description: 'Średnia siła gradientu (filtr Sobela): wysoka dla drobnych, ostrych struktur.',
  },
  {
    value: 'colorfulness',
    label: 'Kolorowość',
    shortLabel: 'Kolorowość',
    description: 'Miara Haslera i Süsstrunka: rozpiętość i nasycenie barw.',
  },
];

const CREATED_AT_OPTION: HotspotSortOption = {
  value: 'created_at',
  label: 'Data dodania',
  description: 'Kolejność zapisania hotspotów.',
};

const TAG_SORT_OPTIONS: HotspotSortOption[] = [
  {
    value: 'score',
    label: 'Wynik tagów',
    description: 'Suma wag tagów hotspotu: im wyższa, tym pilniej trzeba go poprawić.',
  },
  {
    value: 'importance',
    label: 'Ważność',
    description: 'Waga tagu ważności; hotspoty bez oceny ważności są na końcu.',
  },
  {
    value: 'accuracy',
    label: 'Poprawność',
    description: 'Waga tagu poprawności (błędna waży więcej); hotspoty bez oceny poprawności są na końcu.',
  },
];

export const HOTSPOT_SORT_OPTIONS: HotspotSortOption[] = [CREATED_AT_OPTION, ...HOTSPOT_FEATURES, ...TAG_SORT_OPTIONS];

/** Assessing picks among untagged hotspots, so the tag-based orders make no sense there. */
export const sortOptionsFor = (mode: HotspotMode): HotspotSortOption[] => {
  if (mode === 'assess') return [CREATED_AT_OPTION, ...HOTSPOT_FEATURES];
  if (mode === 'reannotate') return [...TAG_SORT_OPTIONS, CREATED_AT_OPTION, ...HOTSPOT_FEATURES];
  return HOTSPOT_SORT_OPTIONS;
};
