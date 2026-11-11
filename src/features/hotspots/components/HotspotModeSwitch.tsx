import { ClipboardCheck, Eye, PenLine } from 'lucide-react';
import { HOTSPOT_MODES, type HotspotMode } from '../utils/hotspotReview';
import './Hotspots.css';

const MODE_ICONS: Record<HotspotMode, typeof Eye> = { browse: Eye, assess: ClipboardCheck, reannotate: PenLine };

interface HotspotModeSwitchProps {
  mode: HotspotMode;
  onChange: (mode: HotspotMode) => void;
  /** Modes left out of the switch (the detail view has no use for browsing). */
  hidden?: HotspotMode[];
}

/** Browse the catalog, assess untagged hotspots, or reannotate tagged ones. */
export default function HotspotModeSwitch({ mode, onChange, hidden = [] }: HotspotModeSwitchProps) {
  return (
    <div className="segmented" role="group" aria-label="Tryb pracy">
      {HOTSPOT_MODES.filter((option) => !hidden.includes(option.value)).map((option) => {
        const active = option.value === mode;
        const Icon = MODE_ICONS[option.value];
        return (
          <button
            key={option.value}
            type="button"
            className={`segmented__option${active ? ' segmented__option--active' : ''}`}
            aria-pressed={active}
            title={option.description}
            onClick={() => onChange(option.value)}
          >
            <Icon size={15} aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
