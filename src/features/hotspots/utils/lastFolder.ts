const LAST_FOLDER_KEY = 'hotspots.lastFolderId';

// A per-browser convenience only: storage may be unavailable (private mode, blocked site data).

export const readLastFolderId = (): string | null => {
  try {
    return localStorage.getItem(LAST_FOLDER_KEY);
  } catch {
    return null;
  }
};

export const rememberLastFolderId = (folderId: string): void => {
  try {
    localStorage.setItem(LAST_FOLDER_KEY, folderId);
  } catch {
    // Ignored: the next hotspot just defaults to the first folder.
  }
};
