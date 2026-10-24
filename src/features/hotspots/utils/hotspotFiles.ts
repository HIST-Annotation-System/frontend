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
export const pickHotspotImages = (
  files: Iterable<File>,
  pathOf: (file: File) => string = (file) => file.webkitRelativePath || file.name,
): { images: File[]; skipped: number } => {
  const all = [...files];
  const images = all
    .filter(isHotspotImageFile)
    .sort((a, b) => pathOf(a).localeCompare(pathOf(b), 'pl', { numeric: true }));
  return { images, skipped: all.length - images.length };
};

const entryFile = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));

/** Every file under a dropped file or folder, with its path inside the drop. */
async function readEntry(entry: FileSystemEntry, found: Map<File, string>): Promise<void> {
  if (entry.isFile) {
    found.set(await entryFile(entry as FileSystemFileEntry), entry.fullPath.replace(/^\//, ''));
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // A folder is read in batches until an empty one.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return;
    for (const child of batch) await readEntry(child, found);
  }
}

/** The images among dropped files and folders (folders at any depth), sorted by their path like a picked folder. */
export async function pickDroppedHotspotImages(data: DataTransfer): Promise<{ images: File[]; skipped: number }> {
  // Entries are taken before any await: the drop's data is gone once the event handler returns.
  const entries = Array.from(data.items).map((item) => item.webkitGetAsEntry()).filter((entry) => entry !== null);
  if (entries.length === 0) return pickHotspotImages(data.files);
  const found = new Map<File, string>();
  for (const entry of entries) await readEntry(entry, found);
  return pickHotspotImages(found.keys(), (file) => found.get(file) ?? file.name);
}
