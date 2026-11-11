import Button from '../../../components/ui/Button';
import type { Hotspot } from '../../../types/hotspot';
import { confirmedLabel, formatFigure, gatingValue, METRIC_LABELS } from '../utils/reannotation';
import './Reannotation.css';

interface AgreementSummaryProps {
  hotspot: Hotspot;
  onOpenDetails: () => void;
}

/** In the side panel: how many annotators have confirmed and how they agree, from what is listed with the hotspot. */
export default function AgreementSummary({ hotspot, onOpenDetails }: AgreementSummaryProps) {
  const { reannotation: summary } = hotspot;
  const gate = gatingValue(summary);
  const other = summary.metric === 'iou' ? 'kappa' : 'iou';

  return (
    <div className="agreement-summary">
      <dl className="agreement-facts">
        <dt>Zatwierdziło</dt>
        <dd>{confirmedLabel(summary.confirmed_count)}</dd>
        <dt>{summary.metric ? `${METRIC_LABELS[summary.metric]} / T` : 'Zgodność'}</dt>
        <dd>{gate === null ? '—' : `${formatFigure(gate)} / ${formatFigure(summary.threshold)}`}</dd>
        {summary.metric && (
          <>
            <dt>{METRIC_LABELS[other]}</dt>
            <dd>{formatFigure(summary[other])}</dd>
          </>
        )}
      </dl>
      <Button variant="ghost" onClick={onOpenDetails}>
        Szczegóły
      </Button>
    </div>
  );
}
