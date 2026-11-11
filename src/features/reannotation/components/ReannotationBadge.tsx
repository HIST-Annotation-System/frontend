import { useState } from 'react';
import type { Hotspot } from '../../../types/hotspot';
import { gateLabel, progressLabel } from '../utils/reannotation';
import AgreementDialog from './AgreementDialog';
import './Reannotation.css';

/** The state of a hotspot's reannotation in the catalogue: progress, then the gating figure against T. A click opens
 * the details. Nothing for a hotspot marked reannotated by hand. */
export default function ReannotationBadge({ hotspot }: { hotspot: Hotspot }) {
  const [open, setOpen] = useState(false);
  const progress = progressLabel(hotspot);
  if (progress === null) return null;
  const gate = gateLabel(hotspot.reannotation);

  return (
    <>
      <button
        type="button"
        className="reannotation-badge"
        title="Pokaż szczegóły zgodności"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {progress}
        {gate && <span className="reannotation-badge__gate"> · {gate}</span>}
      </button>
      {open && (
        <AgreementDialog hotspotId={hotspot.id} hotspotName={hotspot.name} open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
