import { HOTSPOT_MODES, type HotspotMode } from '../utils/hotspotReview';
import './Hotspots.css';

interface HotspotModeSwitchProps {
  mode: HotspotMode;
  onChange: (mode: HotspotMode) => void;
}

/** Browse the catalog, assess untagged hotspots, or reannotate tagged ones. */
export default function HotspotModeSwitch({ mode, onChange }: HotspotModeSwitchProps) {
  return (
    <div className="segmented" role="group" aria-label="Tryb pracy">
      {HOTSPOT_MODES.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            className={`segmented__option${active ? ' segmented__option--active' : ''}`}
            aria-pressed={active}
            title={option.description}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
