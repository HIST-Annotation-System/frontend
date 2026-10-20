import Button from '../../../components/ui/Button';
import { HOTSPOT_MODES, type HotspotMode } from '../utils/hotspotReview';
import './Hotspots.css';

interface HotspotModeSwitchProps {
  mode: HotspotMode;
  onChange: (mode: HotspotMode) => void;
}

/** Browse the catalog, assess untagged hotspots, or reannotate tagged ones. */
export default function HotspotModeSwitch({ mode, onChange }: HotspotModeSwitchProps) {
  return (
    <div className="hotspot-modes" role="group" aria-label="Tryb pracy">
      {HOTSPOT_MODES.map((option) => (
        <Button
          key={option.value}
          variant={option.value === mode ? 'primary' : 'default'}
          active={option.value === mode}
          title={option.description}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
