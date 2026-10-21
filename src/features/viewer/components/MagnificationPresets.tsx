import Button from '../../../components/ui/Button';
import { availablePresets } from '../../../utils/magnification';
import { useMagnification } from '../hooks/useMagnification';

/** Tolerance for highlighting the preset that matches the current zoom. */
const ACTIVE_PRESET_TOLERANCE = 0.03;

interface MagnificationPresetsProps {
  nativeMagnification: number | null;
}

/** Quick jumps to standard objective magnifications (replaces the desktop viewer's pyramid-level picker). */
export default function MagnificationPresets({ nativeMagnification }: MagnificationPresetsProps) {
  const { magnification, zoomToMagnification } = useMagnification(nativeMagnification);
  const presets = availablePresets(nativeMagnification);
  if (presets.length === 0) return null;

  return (
    <div className="btn-group" role="group" aria-label="Powiększenie">
      {presets.map((preset) => (
        <Button
          key={preset}
          className="mono-data"
          active={magnification !== null && Math.abs(magnification - preset) <= preset * ACTIVE_PRESET_TOLERANCE}
          title={`Powiększenie ${preset}×`}
          onClick={() => zoomToMagnification(preset)}
        >
          {preset}×
        </Button>
      ))}
    </div>
  );
}
