/** Slide formats the backend ingests (mirrors backend/app/services/slide_formats.py; the backend has the final say). */
export interface SlideFormatInfo {
  name: string;
  extensions: string[];
  /** Made of several files, uploaded together as one .zip archive. */
  multiFile: boolean;
  /** How to upload it (shown in the format guide). */
  upload: string;
}

const SINGLE_FILE = 'Pojedynczy plik';

export const SLIDE_FORMATS: SlideFormatInfo[] = [
  { name: 'Aperio SVS', extensions: ['.svs'], multiFile: false, upload: SINGLE_FILE },
  { name: 'TIFF (piramidalny, kafelkowy)', extensions: ['.tif', '.tiff'], multiFile: false, upload: SINGLE_FILE },
  { name: 'Hamamatsu NDPI', extensions: ['.ndpi'], multiFile: false, upload: SINGLE_FILE },
  { name: 'Leica SCN', extensions: ['.scn'], multiFile: false, upload: SINGLE_FILE },
  { name: 'Ventana BIF', extensions: ['.bif'], multiFile: false, upload: SINGLE_FILE },
  { name: 'Sakura SVSlide', extensions: ['.svslide'], multiFile: false, upload: SINGLE_FILE },
  { name: 'Zeiss CZI', extensions: ['.czi'], multiFile: false, upload: SINGLE_FILE },
  {
    name: 'MIRAX MRXS',
    extensions: ['.mrxs'],
    multiFile: true,
    upload: 'Archiwum .zip: plik X.mrxs oraz folder X/ z plikiem Slidedat.ini i plikami .dat',
  },
  {
    name: 'Hamamatsu VMS',
    extensions: ['.vms'],
    multiFile: true,
    upload: 'Archiwum .zip: plik .vms oraz pliki .jpg i .opt w tym samym folderze',
  },
  {
    name: 'Hamamatsu VMU',
    extensions: ['.vmu'],
    multiFile: true,
    upload: 'Archiwum .zip: plik .vmu oraz pliki .ngr w tym samym folderze',
  },
  {
    name: 'DICOM WSI',
    extensions: ['.dcm'],
    multiFile: true,
    upload: 'Archiwum .zip: wszystkie pliki .dcm jednej serii w jednym folderze',
  },
];

export const ACCEPTED_UPLOAD_EXTENSIONS = [
  ...SLIDE_FORMATS.filter((format) => !format.multiFile).flatMap((format) => format.extensions),
  '.zip',
];

const getExtension = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot).toLowerCase() : '';
};

/** A user-facing reason why the file cannot be uploaded, or null when it is acceptable. */
export const validateSlideFile = (file: Pick<File, 'name' | 'size'>): string | null => {
  const extension = getExtension(file.name);
  const multiFileFormat = SLIDE_FORMATS.find((format) => format.multiFile && format.extensions.includes(extension));
  if (multiFileFormat) {
    return `„${multiFileFormat.name}” to format wieloplikowy – spakuj slajd razem z plikami towarzyszącymi do jednego archiwum .zip.`;
  }
  if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension)) {
    return `Nieobsługiwany typ pliku (${extension || file.name}).`;
  }
  if (file.size === 0) return 'Wybrany plik jest pusty.';
  return null;
};
