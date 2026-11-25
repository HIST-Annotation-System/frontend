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

/** "2 dni temu" for the last week, the date after that; callers show the full date as a tooltip. */
export const formatRelativeDate = (isoDate: string): string => {
  const seconds = (new Date(isoDate).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]];
  if (Math.abs(seconds) >= 7 * 86400) return new Date(isoDate).toLocaleDateString('pl-PL', { dateStyle: 'medium' });
  const unit = units.find(([, size]) => Math.abs(seconds) >= size);
  return unit
    ? new Intl.RelativeTimeFormat('pl', { numeric: 'auto' }).format(Math.round(seconds / unit[1]), unit[0])
    : 'przed chwilą';
};

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
