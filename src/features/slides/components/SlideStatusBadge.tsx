import Badge, { type BadgeTone } from '../../../components/ui/Badge';
import type { SlideStatus } from '../../../types/slide';

const STATUS_LABELS: Record<SlideStatus, { label: string; tone: BadgeTone }> = {
  uploading: { label: 'Wgrywanie', tone: 'info' },
  processing: { label: 'Przetwarzanie', tone: 'accent' },
  ready: { label: 'Gotowy', tone: 'success' },
  failed: { label: 'Błąd', tone: 'danger' },
};

interface SlideStatusBadgeProps {
  status: SlideStatus;
}

export default function SlideStatusBadge({ status }: SlideStatusBadgeProps) {
  const { label, tone } = STATUS_LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
