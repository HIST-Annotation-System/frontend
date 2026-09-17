/** Slide files the backend ingests (mirrors backend/app/services/slide_formats.py; the backend has the final say). */
export const SINGLE_FILE_SLIDE_EXTENSIONS = ['.svs', '.tif', '.tiff', '.ndpi', '.scn', '.bif', '.svslide', '.czi'];

/** Formats made of several files; they are uploaded as one .zip archive. */
export const MULTI_FILE_SLIDE_FORMATS = [
  { extension: '.mrxs', name: 'MIRAX MRXS' },
  { extension: '.vms', name: 'Hamamatsu VMS' },
  { extension: '.vmu', name: 'Hamamatsu VMU' },
  { extension: '.dcm', name: 'DICOM WSI' },
];

export const ACCEPTED_UPLOAD_EXTENSIONS = [...SINGLE_FILE_SLIDE_EXTENSIONS, '.zip'];

const getExtension = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot).toLowerCase() : '';
};

/** A user-facing reason why the file cannot be uploaded, or null when it is acceptable. */
export const validateSlideFile = (file: Pick<File, 'name' | 'size'>): string | null => {
  const extension = getExtension(file.name);
  const multiFileFormat = MULTI_FILE_SLIDE_FORMATS.find((format) => format.extension === extension);
  if (multiFileFormat) {
    return `„${multiFileFormat.name}” to format wieloplikowy – spakuj slajd razem z plikami towarzyszącymi do jednego archiwum .zip.`;
  }
  if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension)) {
    return `Nieobsługiwany typ pliku (${extension || file.name}).`;
  }
  if (file.size === 0) return 'Wybrany plik jest pusty.';
  return null;
};
