import { Fragment } from 'react';
import MoreDetails from '../../../components/ui/MoreDetails';
import type { Slide } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDecimal, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useOrganizations } from '../../organizations/hooks/useOrganizations';

type Row = [label: string, value: string];

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="kv">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd title={value}>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * A slide's parameters for its library preview and its viewer: who added it and when, then the image's and the
 * file's technical data folded away. The magnification is the scanner's objective power, or an estimate from the pixel size.
 */
export default function SlideFacts({ slide }: { slide: Slide }) {
  const magnification = getNativeMagnification(slide);
  // Organization names are known to the system admin only; everyone else sees their own organization's slides.
  const { organizations } = useOrganizations();
  const scope =
    slide.organization_id === null
      ? 'Globalny (wszystkie organizacje)'
      : organizations.find((organization) => organization.id === slide.organization_id)?.name;
  const main: Row[] = [
    ...(scope ? ([['Zasięg', scope]] as Row[]) : []),
    ['Dodano', formatDateTime(slide.created_at)],
    [slide.status === 'uploading' ? 'Wgrywa' : 'Dodał', slide.uploaded_by ?? '—'],
    ['Powiększenie', magnification ? `${magnification}×${slide.objective_power ? '' : ' (szacowane)'}` : '—'],
    ['Rozmiar pliku', slide.file_size_bytes !== null ? formatBytes(slide.file_size_bytes) : '—'],
  ];
  const technical: Row[] = [
    ['Wymiary', formatDimensions(slide.width, slide.height)],
    ['Plik', slide.original_filename],
    ['Format', slide.vendor ?? '—'],
    ['Rozdzielczość', slide.mpp_x ? `${formatDecimal(slide.mpp_x, 4)} µm/px` : '—'],
    ['Poziomy piramidy', slide.level_count?.toString() ?? '—'],
  ];

  return (
    <>
      <Rows rows={main} />
      <MoreDetails>
        <Rows rows={technical} />
      </MoreDetails>
    </>
  );
}
