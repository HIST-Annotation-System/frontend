import type { HotspotFeature, HotspotSort } from '../../../types/hotspot';
import type { HotspotMode } from './hotspotReview';

export interface HotspotSortOption {
  value: HotspotSort;
  label: string;
  /** What a high value means, shown as the select's tooltip. */
  description: string;
}

/** The image stats computed on every hotspot, with a short label for the details panel and table headers. */
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
    value: 'hematoxylin',
    label: 'Hematoksylina',
    shortLabel: 'Hematoksylina',
    description: 'Średnie stężenie hematoksyliny (barwnik jąder) z dekonwolucji barw: im wyższe, tym więcej jąder.',
  },
];

const CREATED_AT_OPTION: HotspotSortOption = {
  value: 'created_at',
  label: 'Data dodania',
  description: 'Kolejność zapisania hotspotów.',
};

const ESTIMATED_PRIORITY_OPTION: HotspotSortOption = {
  value: 'estimated_priority',
  label: 'Szacowany priorytet',
  description:
    'Ocena z obrazu i komórek modelu, z wagami ustawionymi przez administratora: im wyższa, tym wcześniej warto ocenić hotspot. Puste szkło jest na końcu.',
};

const CELL_COUNT_OPTION: HotspotSortOption = {
  value: 'cell_count',
  label: 'Liczba komórek',
  description: 'Liczba komórek znalezionych przez model; hotspoty, których model jeszcze nie przetworzył, są na końcu.',
};

const CELL_DENSITY_OPTION: HotspotSortOption = {
  value: 'cell_density',
  label: 'Gęstość komórek',
  description:
    'Komórki modelu na mm²; potrzebuje rozdzielczości obrazu i przetworzonego hotspotu, pozostałe są na końcu.',
};

const SCORE_OPTION: HotspotSortOption = {
  value: 'score',
  label: 'Wynik tagów',
  description: 'Suma wag tagów hotspotu: im wyższa, tym pilniej trzeba go poprawić.',
};

const DISAGREEMENT_OPTION: HotspotSortOption = {
  value: 'disagreement',
  label: 'Niezgodność anotatorów',
  description: 'Jak daleko anotatorzy są od pełnej zgody (wg miary organizacji); hotspoty bez porównania są na końcu.',
};

const MISSING_UNCERTAINTY =
  'Hotspoty, dla których model jeszcze jej nie podał (przetworzone wcześniej), są na końcu: przelicz ich folder.';

/** How unsure the model is of its cells (1 - its mean confidence); descending puts the least sure first. */
export const UNCERTAINTY_OPTIONS: HotspotSortOption[] = [
  {
    value: 'model_uncertainty',
    label: 'Niepewność modelu',
    description: `Średnia niepewności segmentacji i klasyfikacji: im wyższa, tym bardziej warto sprawdzić komórki modelu. ${MISSING_UNCERTAINTY}`,
  },
  {
    value: 'outline_uncertainty',
    label: 'Niepewność segmentacji',
    description: `Jak bardzo model nie jest pewien, że jego obrysy to komórki (średnio po komórkach). ${MISSING_UNCERTAINTY}`,
  },
  {
    value: 'class_uncertainty',
    label: 'Niepewność klasyfikacji',
    description: `Jak bardzo model nie jest pewien typów komórek (średnio po komórkach z typem). ${MISSING_UNCERTAINTY}`,
  },
];

/** Unrated hotspots have no tags, so they are ordered by what the image and the model say about them. */
const ASSESS_SORT_OPTIONS: HotspotSortOption[] = [
  ESTIMATED_PRIORITY_OPTION,
  CREATED_AT_OPTION,
  CELL_DENSITY_OPTION,
  CELL_COUNT_OPTION,
  ...UNCERTAINTY_OPTIONS,
  ...HOTSPOT_FEATURES,
];

/** Rated hotspots are ordered by the experts' verdict and by how their reannotation went. */
const REANNOTATE_SORT_OPTIONS: HotspotSortOption[] = [
  SCORE_OPTION,
  CREATED_AT_OPTION,
  DISAGREEMENT_OPTION,
  ...UNCERTAINTY_OPTIONS,
  {
    value: 'cell_count',
    label: 'Liczba masek do poprawy',
    description: 'Liczba komórek narysowanych przez model: im więcej, tym więcej pracy przy poprawianiu.',
  },
];

export const sortOptionsFor = (mode: HotspotMode): HotspotSortOption[] =>
  mode === 'assess' ? ASSESS_SORT_OPTIONS : REANNOTATE_SORT_OPTIONS;
