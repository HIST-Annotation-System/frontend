import { Link } from 'react-router-dom';
import type { Hotspot } from '../../../types/hotspot';

/** Where a hotspot came from: its slide (a link while the slide exists), or an uploaded file. */
export default function HotspotSource({ hotspot }: { hotspot: Pick<Hotspot, 'slide_id' | 'slide_name'> }) {
  if (hotspot.slide_name === null) return <>Wgrany obraz</>;
  if (hotspot.slide_id === null) return <>{hotspot.slide_name} (usunięty)</>;
  return <Link to={`/slides/${hotspot.slide_id}`}>{hotspot.slide_name}</Link>;
}
