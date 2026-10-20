import type { Hotspot, HotspotSort } from '../../../types/hotspot';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import './Hotspots.css';

interface HotspotStatsProps {
  hotspot: Hotspot;
  /** The catalog's order; that stat is emphasised. */
  sort: HotspotSort;
}

/** Every image stat of the hotspot ("—" when it could not be computed). */
export default function HotspotStats({ hotspot, sort }: HotspotStatsProps) {
  return (
    <dl className="hotspot-stats">
      {HOTSPOT_FEATURES.map((feature) => {
        const value = hotspot.features?.[feature.value];
        return (
          <div
            key={feature.value}
            className={`hotspot-stats__item${feature.value === sort ? ' hotspot-stats__item--active' : ''}`}
            title={feature.description}
          >
            <dt>{feature.shortLabel}</dt>
            <dd className="mono-data">{value === undefined ? '—' : value.toFixed(2)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
