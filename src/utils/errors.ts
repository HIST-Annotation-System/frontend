export const getErrorMessage = (error: unknown, fallback = 'Wystąpił nieoczekiwany błąd.'): string =>
  error instanceof Error && error.message ? error.message : fallback;
