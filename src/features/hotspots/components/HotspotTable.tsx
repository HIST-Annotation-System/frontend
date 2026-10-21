import { useNavigate } from 'react-router-dom';
import type { Hotspot, HotspotSort } from '../../../types/hotspot';
import type { Tag } from '../../../types/tag';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import { useTags } from '../hooks/useTags';
import { HOTSPOT_STATUS_OPTIONS, hotspotStatus } from '../utils/hotspotReview';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TAG_DIMENSIONS, tagTone } from '../utils/hotspotTags';
import './Hotspots.css';

interface HotspotTableProps {
  hotspots: Hotspot[];
  /** The catalog's order; that column is emphasised. */
  sort: HotspotSort;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  /** The row shown in the preview pane. */
  previewId: string | null;
  onPreview: (hotspotId: string) => void;
  /** Ticked for bulk tagging. */
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (hotspotId: string) => void;
}

/** The browse view: one dense row per hotspot. A click shows it in the preview pane, a double click opens it. */
export default function HotspotTable({
  hotspots,
  sort,
  linkSearch,
  previewId,
  onPreview,
  selectedIds,
  onToggleSelect,
}: HotspotTableProps) {
  const { data: allTags = [] } = useTags();
  const navigate = useNavigate();
  const sorted = (column: HotspotSort) => (column === sort ? ' hotspot-table__sorted' : '');

  return (
    <table className="data-table hotspot-table">
      <thead>
        <tr>
          <th aria-label="Zaznaczenie" />
          <th>Nazwa</th>
          <th>Źródło</th>
          <th className="data-table__num">Rozmiar</th>
          {HOTSPOT_FEATURES.map((feature) => (
            <th key={feature.value} title={feature.description} className={`data-table__num${sorted(feature.value)}`}>
              {feature.shortLabel}
            </th>
          ))}
          {TAG_DIMENSIONS.map((dimension) => (
            <th key={dimension.value} className={sorted(dimension.value)}>
              {dimension.label}
            </th>
          ))}
          <th>Tagi</th>
          <th className={`data-table__num${sorted('score')}`}>Wynik</th>
          <th>Stan</th>
          <th className="data-table__num">Anotacje</th>
          <th className={sorted('created_at')}>Utworzono</th>
        </tr>
      </thead>
      <tbody>
        {hotspots.map((hotspot) => (
          <tr
            key={hotspot.id}
            aria-selected={hotspot.id === previewId}
            onClick={() => onPreview(hotspot.id)}
            onDoubleClick={() => navigate(`/hotspots/${hotspot.id}${linkSearch}`)}
          >
            <td onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedIds.has(hotspot.id)}
                aria-label={`Zaznacz hotspot ${hotspot.name}`}
                onChange={() => onToggleSelect(hotspot.id)}
              />
            </td>
            <td className="hotspot-table__name" title={hotspot.name}>
              {hotspot.name}
            </td>
            <td className="hotspot-table__text data-table__muted" title={hotspot.slide_name ?? undefined}>
              {hotspot.slide_name ?? 'wgrany obraz'}
              {hotspot.slide_name !== null && hotspot.slide_id === null && ' (usunięty)'}
            </td>
            <td className="data-table__num">{formatDimensions(hotspot.image_width, hotspot.image_height)}</td>
            {HOTSPOT_FEATURES.map((feature) => {
              const value = hotspot.features?.[feature.value];
              return (
                <td key={feature.value} className="data-table__num">
                  {value === undefined ? '—' : value.toFixed(2)}
                </td>
              );
            })}
            {TAG_DIMENSIONS.map((dimension) => (
              <td key={dimension.value}>
                <TagText tags={hotspot.tags.filter((tag) => tag.dimension === dimension.value)} allTags={allTags} />
              </td>
            ))}
            <td className="hotspot-table__text">
              <TagText tags={hotspot.tags.filter((tag) => tag.dimension === null)} allTags={allTags} />
            </td>
            <td className="data-table__num">{hotspot.score}</td>
            <td className="data-table__muted">
              {HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot))?.label}
            </td>
            <td className="data-table__num">{hotspot.annotation_count}</td>
            <td className="mono-data">{formatDateTime(hotspot.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tag names as plain text; the alarming ones (wrong annotation, top importance) in red. */
export function TagText({ tags, allTags }: { tags: Tag[]; allTags: Tag[] }) {
  if (tags.length === 0) return <span className="data-table__muted">—</span>;
  return (
    <>
      {tags.map((tag, index) => (
        <span key={tag.id} className={tagTone(tag, allTags) === 'danger' ? 'text-error' : undefined}>
          {index > 0 && ', '}
          {tag.name}
        </span>
      ))}
    </>
  );
}
