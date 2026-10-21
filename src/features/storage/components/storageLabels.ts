const KIND_BY_EXTENSION: Record<string, string> = {
  svs: 'Slajd Aperio',
  ndpi: 'Slajd Hamamatsu',
  mrxs: 'Slajd 3DHistech',
  scn: 'Slajd Leica',
  vms: 'Slajd Hamamatsu',
  vmu: 'Slajd Hamamatsu',
  bif: 'Slajd Ventana',
  tif: 'Obraz TIFF',
  tiff: 'Obraz TIFF',
  png: 'Obraz PNG',
  jpg: 'Obraz JPEG',
  jpeg: 'Obraz JPEG',
  dzi: 'Deep Zoom',
};

/** Human-readable file type shown in the "Typ" column, derived from the extension only. */
export function fileKind(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'Plik';
  const extension = name.slice(dot + 1).toLowerCase();
  return KIND_BY_EXTENSION[extension] ?? `Plik ${extension.toUpperCase()}`;
}

function polishPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return `${count} ${one}`;
  const last = count % 10;
  const lastTwo = count % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

/** "3 foldery · 12 plików" summary of the loaded folder listing. */
export function folderSummary(folders: number, files: number): string {
  return `${polishPlural(folders, 'folder', 'foldery', 'folderów')} · ${polishPlural(files, 'plik', 'pliki', 'plików')}`;
}
