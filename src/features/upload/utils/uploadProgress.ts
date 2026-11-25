import { formatRemainingTime, formatTransferRate } from '../../../utils/format';
import type { UploadItem } from './uploadQueue';

export const progressPercent = (item: Pick<UploadItem, 'uploadedBytes' | 'file'>): number =>
  item.file.size > 0 ? Math.min(100, Math.floor((item.uploadedBytes / item.file.size) * 100)) : 100;

/** "42% · 11 MB/s · zostało ~1 min 20 s" while uploading; just the percentage until the speed settles. */
export const describeTransfer = (item: Pick<UploadItem, 'uploadedBytes' | 'file' | 'bytesPerSecond' | 'etaSeconds'>): string =>
  [
    `${progressPercent(item)}%`,
    item.bytesPerSecond !== null ? formatTransferRate(item.bytesPerSecond) : null,
    item.etaSeconds !== null ? `zostało ${formatRemainingTime(item.etaSeconds)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
