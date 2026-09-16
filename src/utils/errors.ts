export const getErrorMessage = (error: unknown, fallback = 'Wystąpił nieoczekiwany błąd.'): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** Thrown by an in-flight upload request that was aborted by the user, not a real failure. */
export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled');
    this.name = 'UploadCancelledError';
  }
}
