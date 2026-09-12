/** File types the backend ingests (mirrors SLIDE_ALLOWED_EXTENSIONS; the backend has the final say). */
export const ACCEPTED_SLIDE_EXTENSIONS = [
  '.svs',
  '.tif',
  '.tiff',
  '.ndpi',
  '.scn',
  '.bif',
  '.svslide',
  '.jpg',
  '.jpeg',
  '.png',
  '.bmp',
  '.zip',
] as const;

export const MRXS_ZIP_HINT =
  'Slajdy MRXS składają się z pliku .mrxs i folderu danych – spakuj je razem do jednego archiwum .zip.';

const getExtension = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot).toLowerCase() : '';
};

/** A user-facing reason why the file cannot be uploaded, or null when it is acceptable. */
export const validateSlideFile = (file: Pick<File, 'name' | 'size'>): string | null => {
  const extension = getExtension(file.name);
  if (extension === '.mrxs') return MRXS_ZIP_HINT;
  if (!(ACCEPTED_SLIDE_EXTENSIONS as readonly string[]).includes(extension)) {
    return `Nieobsługiwany typ pliku (${extension || file.name}).`;
  }
  if (file.size === 0) return 'Wybrany plik jest pusty.';
  return null;
};
