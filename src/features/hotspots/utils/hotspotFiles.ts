/** File extensions accepted as hotspot images (the server checks the actual content too). */
const HOTSPOT_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'] as const;

/** `accept` attribute for the file picker. */
export const HOTSPOT_IMAGE_ACCEPT = [...HOTSPOT_IMAGE_EXTENSIONS, 'image/png', 'image/jpeg'].join(',');

export const isHotspotImageFile = (file: Pick<File, 'name'>): boolean => {
  const name = file.name.toLowerCase();
  // Hidden files such as macOS "._photo.jpg" resource forks are not images.
  return !name.startsWith('.') && HOTSPOT_IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension));
};

/**
 * The images among the picked files (a picked folder includes everything inside it, at any depth),
 * sorted by their path so a folder uploads in a predictable order.
 */
export const pickHotspotImages = (files: Iterable<File>): { images: File[]; skipped: number } => {
  const all = [...files];
  const images = all
    .filter(isHotspotImageFile)
    .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, 'pl', { numeric: true }));
  return { images, skipped: all.length - images.length };
};
