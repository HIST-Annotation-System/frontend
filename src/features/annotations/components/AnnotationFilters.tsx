import { Bot, Eye, EyeOff, Square, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { useAnnotations } from '../hooks/useAnnotations';
import {
  EXCLUDED_LAYER,
  listLayers,
  type AnnotationLayerKind,
  type ModelFilter,
} from '../utils/annotationLayers';
import '../../../components/ui/SidebarSection.css';
import './AnnotationTools.css';

/** Which of the panel's two parts are rolled up, remembered for the next hotspot. */
const COLLAPSED_KEY = 'hist.annotationPanel.collapsed';

const readCollapsed = (): { layers: boolean; types: boolean } => {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}') as { layers?: boolean; types?: boolean };
    return { layers: Boolean(stored.layers), types: Boolean(stored.types) };
  } catch {
    return { layers: false, types: false };
  }
};

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = (part: 'layers' | 'types') =>
    setCollapsed((current) => {
      const next = { ...current, [part]: !current[part] };
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Not remembered (private window): it still rolls up now.
      }
      return next;
    });
  return { collapsed, toggle };
}

const caret = (open: boolean) => <span className="sidebar-section__caret">{open ? '▾' : '▸'}</span>;

const LAYER_ICONS: Record<AnnotationLayerKind, ReactNode> = {
  model: <Bot size={13} className="annotation-layers__icon" aria-hidden="true" />,
  author: <User size={13} className="annotation-layers__icon" aria-hidden="true" />,
  excluded: <Square size={13} className="annotation-layers__icon" aria-hidden="true" />,
};

interface VisibilityRowProps {
  shown: boolean;
  title: string;
  onToggle: () => void;
  children: ReactNode;
}

/** One row with an eye: shows or hides what it names, on the image too. */
function VisibilityRow({ shown, title, onToggle, children }: VisibilityRowProps) {
  return (
    <button
      type="button"
      className={`annotation-filter__option annotation-layers__option${shown ? '' : ' annotation-layers__option--hidden'}`}
      aria-pressed={shown}
      title={title}
      onClick={onToggle}
    >
      {shown ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
      {children}
    </button>
  );
}

interface AnnotationFiltersProps {
  owner: AnnotationOwner;
  classes: AnnotationClass[];
  /** Cell types switched off: hidden on the image. */
  hiddenClassIds: ReadonlySet<string>;
  onToggleClass: (classId: string) => void;
  onShowAllClasses: () => void;
  /** Layers switched off (model cells, one author's cells, excluded areas): hidden on the image. */
  hiddenLayers: ReadonlySet<string>;
  onToggleLayer: (layer: string) => void;
  /** How opaque each layer is drawn, 0 to 1 (a layer missing here is fully opaque). */
  layerOpacity: ReadonlyMap<string, number>;
  onLayerOpacity: (layer: string, opacity: number) => void;
  /** Which of the model's cells are drawn; null when the user has no layer of their own, so nothing waits for them. */
  modelFilter: ModelFilter | null;
  onModelFilter: (filter: ModelFilter) => void;
}

const MODEL_FILTERS: { value: ModelFilter; label: string; title: string }[] = [
  { value: 'all', label: 'Wszystkie', title: 'Wszystkie komórki modelu' },
  { value: 'remaining', label: 'Pozostałe', title: 'Komórki modelu, których jeszcze nie zmieniono ani nie zatwierdzono' },
];

/** What is shown on the image: the layers (model, each author) and the cell types, each switched with an eye. */
export default function AnnotationFilters({
  owner,
  classes,
  hiddenClassIds,
  onToggleClass,
  onShowAllClasses,
  hiddenLayers,
  onToggleLayer,
  layerOpacity,
  onLayerOpacity,
  modelFilter,
  onModelFilter,
}: AnnotationFiltersProps) {
  const { data: annotations, isPending, isError, error } = useAnnotations(owner);
  const { collapsed, toggle } = useCollapsed();
  // Layers whose opacity slider is rolled out.
  const [openSliders, setOpenSliders] = useState<ReadonlySet<string>>(new Set<string>());
  const toggleSlider = (layer: string) =>
    setOpenSliders((current) => {
      const next = new Set(current);
      if (!next.delete(layer)) next.add(layer);
      return next;
    });

  // Excluded areas are switched with the cell types, the other layers (model, authors) in their own block.
  const allLayers = listLayers(annotations ?? []);
  const layers = allLayers.filter((layer) => layer.key !== EXCLUDED_LAYER);
  const hasAreas = allLayers.some((layer) => layer.key === EXCLUDED_LAYER);
  const usedClassIds = new Set<string>();
  annotations?.forEach(({ kind, class_id: classId }) => {
    if (kind !== 'excluded' && classId !== null) usedClassIds.add(classId);
  });
  const usedClasses = classes.filter((item) => usedClassIds.has(item.id));
  const filtered = usedClasses.some((item) => hiddenClassIds.has(item.id));

  let types;
  if (isPending) types = <Spinner label="Wczytywanie anotacji…" />;
  else if (isError) types = <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać anotacji.')} />;
  else if (usedClasses.length === 0 && !hasAreas) types = <p className="annotation-filter__empty">Brak komórek</p>;
  else
    types = (
      <div className="annotation-filter">
        {usedClasses.map((item) => {
          const shown = !hiddenClassIds.has(item.id);
          return (
            <VisibilityRow
              key={item.id}
              shown={shown}
              title={`${shown ? 'Ukryj' : 'Pokaż'} typ: ${item.name}`}
              onToggle={() => onToggleClass(item.id)}
            >
              <span className="annotation-item__swatch" style={{ background: item.color }} aria-hidden="true" />
              <span className="annotation-filter__name">{item.name}</span>
            </VisibilityRow>
          );
        })}
        {hasAreas && (
          <VisibilityRow
            shown={!hiddenLayers.has(EXCLUDED_LAYER)}
            title="Obszary wyłączone z uczenia modelu"
            onToggle={() => onToggleLayer(EXCLUDED_LAYER)}
          >
            <span className="annotation-item__swatch annotation-item__swatch--excluded" aria-hidden="true" />
            <span className="annotation-filter__name">Obszary wyłączone</span>
          </VisibilityRow>
        )}
      </div>
    );

  return (
    <div className="annotation-panel">
      {layers.length > 0 && (
        <div className="annotation-layers" role="group" aria-labelledby="annotation-layers-title">
          <div className="pane-strip annotation-layers__head">
            <button
              type="button"
              className="sidebar-section__toggle"
              aria-expanded={!collapsed.layers}
              onClick={() => toggle('layers')}
            >
              {caret(!collapsed.layers)}
              <span id="annotation-layers-title">Warstwy</span>
            </button>
          </div>
          {!collapsed.layers && (
            <div className="annotation-filter">
              {layers.map((layer) => {
                const shown = !hiddenLayers.has(layer.key);
                const slider = openSliders.has(layer.key);
                const percent = Math.round((layerOpacity.get(layer.key) ?? 1) * 100);
                return (
                  <div key={layer.key} className="annotation-layers__row">
                    <div className="annotation-layers__line">
                      <VisibilityRow
                        shown={shown}
                        title={`${shown ? 'Ukryj' : 'Pokaż'} warstwę: ${layer.label}`}
                        onToggle={() => onToggleLayer(layer.key)}
                      >
                        {LAYER_ICONS[layer.kind]}
                        <span className="annotation-filter__name">{layer.label}</span>
                      </VisibilityRow>
                      {layer.kind === 'model' && modelFilter !== null && (
                        <div className="annotation-layers__filter" role="group" aria-label="Komórki modelu">
                          {MODEL_FILTERS.map(({ value, label, title }) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={modelFilter === value}
                              title={title}
                              onClick={() => onModelFilter(value)}
                            >
                              {label}
                              {value === 'remaining' && ` (${layer.remaining ?? 0})`}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="annotation-layers__expand"
                        aria-expanded={slider}
                        title={`Przezroczystość warstwy: ${layer.label}`}
                        aria-label={`Przezroczystość warstwy: ${layer.label}`}
                        onClick={() => toggleSlider(layer.key)}
                      >
                        {caret(slider)}
                      </button>
                    </div>
                    {slider && (
                      <label className="annotation-layers__opacity">
                        <span>Krycie</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={percent}
                          aria-label={`Krycie warstwy: ${layer.label}`}
                          onChange={(event) => onLayerOpacity(layer.key, Number(event.target.value) / 100)}
                        />
                        <span className="annotation-layers__percent">{percent}%</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="pane-strip annotation-panel__head">
        <button
          type="button"
          className="sidebar-section__toggle"
          aria-expanded={!collapsed.types}
          onClick={() => toggle('types')}
        >
          {caret(!collapsed.types)}
          Typy komórek
        </button>
        {filtered && (
          <button type="button" className="annotation-panel__show-all" onClick={onShowAllClasses}>
            Pokaż wszystkie
          </button>
        )}
      </div>
      {!collapsed.types && types}
    </div>
  );
}
