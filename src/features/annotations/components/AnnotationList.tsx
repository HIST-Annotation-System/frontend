import { useSelection } from '@annotorious/react';
import { Bot, Eye, EyeOff, Square, User } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { useLatest } from '../../../hooks/useLatest';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { useAnnotationActions } from '../hooks/useAnnotationActions';
import { useAnnotations } from '../hooks/useAnnotations';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import { EXCLUDED_LAYER, isLocked, layerOf, listLayers, type AnnotationLayerKind } from '../utils/annotationLayers';
import ResizableBox from './ResizableBox';
import AnnotationListItem from './AnnotationListItem';
import '../../../components/ui/SidebarSection.css';
import './AnnotationTools.css';

const FIT_PADDING_PX = 80;

/** Which of the panel's two parts are rolled up, remembered for the next hotspot. */
const COLLAPSED_KEY = 'hist.annotationPanel.collapsed';

const readCollapsed = (): { layers: boolean; list: boolean } => {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}') as {
      layers?: boolean;
      list?: boolean;
    };
    return { layers: Boolean(stored.layers), list: Boolean(stored.list) };
  } catch {
    return { layers: false, list: false };
  }
};

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = (part: 'layers' | 'list') =>
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

interface AnnotationListProps {
  owner: AnnotationOwner;
  classes: AnnotationClass[];
  readOnly?: boolean;
  /** In layers: shapes this user may not change (the model's, other people's) show read-only. */
  editableBy?: string;
  /** Cell types unchecked in the filter: hidden here and on the image. */
  hiddenClassIds: ReadonlySet<string>;
  onToggleClass: (classId: string) => void;
  onShowAllClasses: () => void;
  /** Layers switched off (model cells, one author's cells, excluded areas): hidden here and on the image. */
  hiddenLayers: ReadonlySet<string>;
  onToggleLayer: (layer: string) => void;
  /** How opaque each layer is drawn, 0 to 1 (a layer missing here is fully opaque). */
  layerOpacity: ReadonlyMap<string, number>;
  onLayerOpacity: (layer: string, opacity: number) => void;
  onError: (message: string) => void;
}

export default function AnnotationList({
  owner,
  classes,
  readOnly = false,
  editableBy,
  hiddenClassIds,
  onToggleClass,
  onShowAllClasses,
  hiddenLayers,
  onToggleLayer,
  layerOpacity,
  onLayerOpacity,
  onError,
}: AnnotationListProps) {
  const { data: annotations, isPending, isError, error } = useAnnotations(owner);
  const { changeClass, removeAnnotation } = useAnnotationActions(owner, onError);
  const anno = useSlideAnnotator();
  const selection = useSelection();
  const selectedIds = new Set(selection.selected.map(({ annotation }) => annotation.id));

  // Stable, so a change to one annotation re-renders only its own row: a hotspot can hold thousands.
  const latest = useLatest({ anno, readOnly, editableBy, annotations, changeClass, removeAnnotation });
  const showAnnotation = useCallback(
    (annotationId: string) => {
      const { readOnly: all, editableBy: by, annotations: held } = latest.current;
      const found = held?.find((item) => item.id === annotationId);
      latest.current.anno?.setSelected(annotationId, !all && !(found && isLocked(found, by)));
      latest.current.anno?.fitBounds(annotationId, { padding: FIT_PADDING_PX });
    },
    [latest],
  );
  const handleClassChange = useCallback(
    (annotationId: string, classId: string) => void latest.current.changeClass(annotationId, classId),
    [latest],
  );
  const handleDelete = useCallback(
    (annotationId: string) => void latest.current.removeAnnotation(annotationId),
    [latest],
  );

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
  const hiddenLayerCount = layers.filter((layer) => hiddenLayers.has(layer.key)).length;
  const areaTotal = allLayers.find((layer) => layer.key === EXCLUDED_LAYER)?.count ?? 0;
  const numbered = (annotations ?? []).map((annotation, index) => ({
    annotation,
    number: index + 1,
  }));
  const visible = numbered.filter(({ annotation }) => !hiddenLayers.has(layerOf(annotation)));
  const cellTotal = numbered.filter(({ annotation }) => annotation.kind !== 'excluded').length;
  const cells = visible.filter(({ annotation }) => annotation.kind !== 'excluded');
  const areas = visible.filter(({ annotation }) => annotation.kind === 'excluded');
  // Counted over every cell, not only the shown layers: hiding a layer must not remove rows from the filter.
  const counts = new Map<string, number>();
  numbered.forEach(({ annotation }) => {
    if (annotation.kind === 'excluded') return;
    if (annotation.class_id !== null) counts.set(annotation.class_id, (counts.get(annotation.class_id) ?? 0) + 1);
  });
  const rows = cells.filter(({ annotation }) => !hiddenClassIds.has(annotation.class_id ?? ''));
  const usedClasses = classes.filter((item) => counts.has(item.id));
  const filtered = usedClasses.some((item) => hiddenClassIds.has(item.id));

  const renderItems = (items: typeof numbered) =>
    items.map(({ annotation, number }) => (
      <AnnotationListItem
        key={annotation.id}
        annotation={annotation}
        number={number}
        classes={classes}
        selected={selectedIds.has(annotation.id)}
        readOnly={readOnly || isLocked(annotation, editableBy)}
        onSelect={showAnnotation}
        onClassChange={handleClassChange}
        onDelete={handleDelete}
      />
    ));

  let body;
  if (isPending) body = <Spinner label="Wczytywanie anotacji…" />;
  else if (isError) body = <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać anotacji.')} />;
  else if (annotations.length === 0) body = <p className="annotation-list__empty">Brak anotacji</p>;
  else
    body = (
      <>
        {rows.length > 0 && <ul className="annotation-list">{renderItems(rows)}</ul>}
        {areas.length > 0 && (
          <>
            <h3 className="annotation-list__group">Obszary wyłączone ({areas.length})</h3>
            <ul className="annotation-list">{renderItems(areas)}</ul>
          </>
        )}
      </>
    );

  return (
    <div className={`annotation-panel${collapsed.list ? ' annotation-panel--collapsed' : ''}`}>
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
              {hiddenLayerCount > 0 && <span className="annotation-panel__count">ukryte: {hiddenLayerCount}</span>}
            </button>
          </div>
          {!collapsed.layers && (
            <ResizableBox
              storageKey="hist.annotationPanel.layersHeight"
              defaultHeight={92}
              label="warstwy"
              className="annotation-filter-box"
            >
              <div className="annotation-filter annotation-filter--free annotation-layers__list">
                {layers.map((layer) => {
                  const shown = !hiddenLayers.has(layer.key);
                  const slider = openSliders.has(layer.key);
                  const percent = Math.round((layerOpacity.get(layer.key) ?? 1) * 100);
                  return (
                    <div key={layer.key} className="annotation-layers__row">
                      <div className="annotation-layers__line">
                        <button
                          type="button"
                          className={`annotation-filter__option annotation-layers__option${shown ? '' : ' annotation-layers__option--hidden'}`}
                          aria-pressed={shown}
                          title={`${shown ? 'Ukryj' : 'Pokaż'} warstwę: ${layer.label}`}
                          onClick={() => onToggleLayer(layer.key)}
                        >
                          {shown ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
                          {LAYER_ICONS[layer.kind]}
                          <span className="annotation-filter__name">{layer.label}</span>
                          <span className="annotation-filter__count">{layer.count}</span>
                        </button>
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
            </ResizableBox>
          )}
        </div>
      )}
      <div className="pane-strip annotation-panel__head">
        <button
          type="button"
          className="sidebar-section__toggle"
          aria-expanded={!collapsed.list}
          onClick={() => toggle('list')}
        >
          {caret(!collapsed.list)}
          Anotacje
          <span className="annotation-panel__count">
            {annotations ? (rows.length !== cellTotal ? `${rows.length} / ${cellTotal}` : cellTotal) : ''}
          </span>
        </button>
        {filtered && (
          <button type="button" className="annotation-panel__show-all" onClick={onShowAllClasses}>
            Pokaż wszystkie
          </button>
        )}
      </div>
      {!collapsed.list && (usedClasses.length > 0 || areaTotal > 0) && (
        <ResizableBox
          storageKey="hist.annotationPanel.typesHeight"
          defaultHeight={92}
          label="typy komórek"
          className="annotation-filter-box"
        >
          <fieldset className="annotation-filter annotation-filter--free">
            <legend className="visually-hidden">Pokazywane typy komórek</legend>
            {usedClasses.map((item) => (
              <label key={item.id} className="annotation-filter__option" title={item.name}>
                <input type="checkbox" checked={!hiddenClassIds.has(item.id)} onChange={() => onToggleClass(item.id)} />
                <span className="annotation-item__swatch" style={{ background: item.color }} aria-hidden="true" />
                <span className="annotation-filter__name">{item.name}</span>
                <span className="annotation-filter__count">{counts.get(item.id)}</span>
              </label>
            ))}
            {areaTotal > 0 && (
              <label className="annotation-filter__option" title="Obszary wyłączone z uczenia modelu">
                <input
                  type="checkbox"
                  checked={!hiddenLayers.has(EXCLUDED_LAYER)}
                  onChange={() => onToggleLayer(EXCLUDED_LAYER)}
                />
                <span className="annotation-item__swatch annotation-item__swatch--excluded" aria-hidden="true" />
                <span className="annotation-filter__name">Obszary wyłączone</span>
                <span className="annotation-filter__count">{areaTotal}</span>
              </label>
            )}
          </fieldset>
        </ResizableBox>
      )}
      {!collapsed.list && (
        <ResizableBox
          storageKey="hist.annotationPanel.listHeight"
          defaultHeight={360}
          label="lista anotacji"
          className="annotation-panel__body annotation-panel__body--sized"
        >
          {body}
        </ResizableBox>
      )}
    </div>
  );
}
