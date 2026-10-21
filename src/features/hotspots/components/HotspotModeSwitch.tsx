import { LayoutGrid, PencilLine, Star, type LucideIcon } from 'lucide-react';
import { HOTSPOT_MODES, type HotspotMode } from '../utils/hotspotReview';
import './Hotspots.css';

interface HotspotModeSwitchProps {
  mode: HotspotMode;
  onChange: (mode: HotspotMode) => void;
}

const MODE_ICONS: Record<HotspotMode, LucideIcon> = {
  browse: LayoutGrid,
  assess: Star,
  reannotate: PencilLine,
};

/** Browse the catalog, assess untagged hotspots, or reannotate tagged ones. */
export default function HotspotModeSwitch({ mode, onChange }: HotspotModeSwitchProps) {
  return (
    <div className="hotspot-modes" role="group" aria-label="Tryb pracy">
      {HOTSPOT_MODES.map((option) => {
        const Icon = MODE_ICONS[option.value];
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            className={`hotspot-modes__option${active ? ' hotspot-modes__option--active' : ''}`}
            aria-pressed={active}
            title={option.description}
            onClick={() => onChange(option.value)}
          >
            <Icon size={16} className="hotspot-modes__icon" aria-hidden="true" />
            <span className="hotspot-modes__text">
              <span className="hotspot-modes__label">{option.label}</span>
              <span className="hotspot-modes__description">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
