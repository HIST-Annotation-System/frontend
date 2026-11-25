import type { HotspotFeature } from '../../../types/hotspot';
import { formatSquareSize } from '../utils/hotspotFormat';
import { HOTSPOT_BOX_SIZE } from '../utils/hotspotBoxes';
import { formatFeature, summarizeFeature, type FeatureValues } from '../utils/boxStats';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';

interface BoxStatsPanelProps {
  /** Stats of the boxes chosen (as they will be once the drag in progress ends), known ones only. */
  values: FeatureValues[];
  /** All of those boxes, known or not. */
  total: number;
  pending: boolean;
  failed: boolean;
  /** The box under the pointer (chosen, or where the tool would place one), if its stats are known. */
  hovered: FeatureValues | null;
  /** The box under the pointer is still being computed. */
  hoveredPending: boolean;
  /** A box clicked while navigating: its stats stay shown (values null while computed). */
  pinned: { values: FeatureValues | null; pending: boolean } | null;
  onUnpin: () => void;
  mpp: number | null;
  colorBy: HotspotFeature | null;
  onColorByChange: (feature: HotspotFeature | null) => void;
}

const NONE = '';

/** Live image stats of the chosen boxes, the same ones the hotspot catalog sorts by. */
export default function BoxStatsPanel({
  values,
  total,
  pending,
  failed,
  hovered,
  hoveredPending,
  pinned,
  onUnpin,
  mpp,
  colorBy,
  onColorByChange,
}: BoxStatsPanelProps) {
  const state = failed
    ? 'Nie udało się policzyć'
    : pending
      ? `Liczenie… ${values.length}/${total}`
      : hoveredPending || pinned?.pending
        ? 'Liczenie…'
        : null;
  // With no box chosen yet, only the box under the pointer is shown.
  const summary = total > 0;
  const own = hovered !== null || (!summary && !pinned);

  return (
    <div className="floating-panel hotspot-stats" role="region" aria-label="Statystyki pól">
      <div className="hotspot-stats__head">
        <span className="hotspot-stats__title">Statystyki pól</span>
        {state && (
          <span className={`hotspot-stats__state${failed ? ' hotspot-stats__state--error' : ''}`}>{state}</span>
        )}
      </div>
      <p className="hotspot-stats__size">
        {formatSquareSize(HOTSPOT_BOX_SIZE, mpp)}
        {mpp ? ` · ${mpp.toLocaleString('pl-PL', { maximumFractionDigits: 3 })} µm/px` : ''}
      </p>
      <table className="hotspot-stats__table">
        <thead>
          <tr>
            <th scope="col">Cecha</th>
            {summary && (
              <th scope="col" title={`Średnia z ${total} zaznaczonych pól`}>
                Śr. ({total})
              </th>
            )}
            {summary && (
              <th scope="col" title="Najmniejsza i największa wartość wśród zaznaczonych pól">
                Zakres
              </th>
            )}
            {own && (
              <th scope="col" title="Kwadrat pod kursorem">
                Kursor
              </th>
            )}
            {pinned && (
              <th scope="col" className="hotspot-stats__pinned" title="Kwadrat przypięty kliknięciem w trybie Nawigacji">
                Przyp.{' '}
                <button type="button" className="hotspot-stats__unpin" title="Odepnij kwadrat" onClick={onUnpin}>
                  ×
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {HOTSPOT_FEATURES.map((feature) => {
            const stats = summarizeFeature(values, feature.value);
            const value = hovered?.[feature.value];
            return (
              <tr key={feature.value} title={feature.description}>
                <th scope="row">{feature.shortLabel}</th>
                {summary && <td>{stats ? formatFeature(stats.mean) : '—'}</td>}
                {summary && <td>{stats ? `${formatFeature(stats.min)}–${formatFeature(stats.max)}` : '—'}</td>}
                {own && <td className="hotspot-stats__own">{value === undefined ? '—' : formatFeature(value)}</td>}
                {pinned && (
                  <td className="hotspot-stats__own hotspot-stats__pinned">
                    {pinned.values?.[feature.value] === undefined ? '—' : formatFeature(pinned.values[feature.value]!)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <label className="hotspot-stats__color">
        <span>Koloruj pola</span>
        <select
          value={colorBy ?? NONE}
          onChange={(event) => onColorByChange((event.target.value || null) as HotspotFeature | null)}
        >
          <option value={NONE}>Bez koloru</option>
          {HOTSPOT_FEATURES.map((feature) => (
            <option key={feature.value} value={feature.value}>
              {feature.shortLabel}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
