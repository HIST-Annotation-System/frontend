import type { Hotspot } from '../../../types/hotspot';
import type { AgreementMetric, ChangeKind, ReannotationSummary } from '../../../types/reannotation';

/** Annotators who have to confirm before the figures are worked out (the server's `MIN_CONFIRMED`). */
export const MIN_CONFIRMED = 3;

export const METRIC_LABELS: Record<AgreementMetric, string> = { kappa: 'κ Fleissa', iou: 'IoU' };

export const CHANGE_LABELS: Record<ChangeKind, string> = {
  unchanged: 'bez zmian',
  reshaped: 'zmieniony kształt',
  relabeled: 'zmieniony typ',
  removed: 'usunięte',
  added: 'dodane',
};

/** Outline colours of the cells the trace of one annotator singles out; unchanged ones keep their own. */
export const CHANGE_COLORS: Partial<Record<ChangeKind, string>> = {
  reshaped: '#d97706',
  relabeled: '#2563eb',
  added: '#16a34a',
  removed: '#dc2626',
};

/** "2 z 3" while more have to confirm, "4 (min. 3)" once enough have. */
export const confirmedLabel = (count: number): string =>
  count >= MIN_CONFIRMED ? `${count} (min. ${MIN_CONFIRMED})` : `${count} z ${MIN_CONFIRMED}`;

export const formatFigure = (value: number | null | undefined): string => (value == null ? '—' : value.toFixed(2));

/** The figure the threshold applies to; null while too few annotators have confirmed. */
export const gatingValue = ({ metric, kappa, iou }: ReannotationSummary): number | null =>
  metric === 'iou' ? iou : kappa;

/** "κ Fleissa 0.52 / 0.60": the gating figure against the threshold, or null until there is one. */
export function gateLabel(summary: ReannotationSummary): string | null {
  const value = gatingValue(summary);
  if (summary.metric === null || value === null || summary.threshold === null) return null;
  return `${METRIC_LABELS[summary.metric]} ${formatFigure(value)} / ${formatFigure(summary.threshold)}`;
}

/** Where a hotspot's reannotation stands, in words; null for one marked by hand (it has no progress). */
export function progressLabel(hotspot: Pick<Hotspot, 'reannotation' | 'reannotated_at'>): string | null {
  const { reannotation: summary } = hotspot;
  if (!summary.layered) return null;
  if (hotspot.reannotated_at !== null) return 'Poprawione';
  if (summary.started_count === 0) return 'Nie rozpoczęto';
  return `Zatwierdziło ${confirmedLabel(summary.confirmed_count)}`;
}
