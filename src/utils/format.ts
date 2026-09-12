const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
};

export const formatDimensions = (width: number | null, height: number | null): string =>
  width && height ? `${width.toLocaleString('pl-PL')} × ${height.toLocaleString('pl-PL')} px` : '—';

export const formatDateTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
