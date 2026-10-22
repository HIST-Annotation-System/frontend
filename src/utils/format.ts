const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** A number with a fixed count of decimals, Polish style ("0,4990", "806,10"). */
export const formatDecimal = (value: number, digits: number): string =>
  value.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatDecimal(value, value >= 10 || unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`;
};

export const formatDimensions = (width: number | null, height: number | null): string =>
  width && height ? `${width.toLocaleString('pl-PL')} × ${height.toLocaleString('pl-PL')} px` : '—';

export const formatDateTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });

export const formatTransferRate = (bytesPerSecond: number): string => `${formatBytes(bytesPerSecond)}/s`;

/** Remaining time, rounded the way people read it: "~45 s", "~3 min 20 s", "~1 h 5 min". */
export const formatRemainingTime = (seconds: number): string => {
  const total = Math.max(1, Math.round(seconds));
  if (total < 60) return `~${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `~${minutes} min${total % 60 ? ` ${total % 60} s` : ''}`;
  const hours = Math.floor(minutes / 60);
  return `~${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
};
