import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import type { Hotspot } from '../../../types/hotspot';
import './Hotspots.css';

interface HotspotSavedNoticeProps {
  hotspot: Hotspot;
  onDismiss: () => void;
}

/** Confirmation over the viewer after a hotspot was saved, with a shortcut to annotate it. */
export default function HotspotSavedNotice({ hotspot, onDismiss }: HotspotSavedNoticeProps) {
  return (
    <div className="hotspot-saved" role="status">
      <span>
        Zapisano hotspot „{hotspot.name}”.
      </span>
      <Link to={`/hotspots/${hotspot.id}`}>Otwórz do anotacji</Link>
      <Link to={`/hotspots?folder=${hotspot.folder_id}`}>Pokaż folder</Link>
      <Button variant="ghost" icon={<X size={14} />} aria-label="Zamknij" onClick={onDismiss} />
    </div>
  );
}
