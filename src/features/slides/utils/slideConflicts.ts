import { ApiError } from '../../../services/httpClient';
import { getErrorMessage } from '../../../utils/errors';

export const SLIDE_MODIFIED_MESSAGE =
  'Ktoś inny zmienił ten slajd w międzyczasie. Lista została odświeżona - sprawdź zmiany i spróbuj ponownie.';
export const SLIDE_GONE_MESSAGE = 'Ten slajd został już usunięty przez kogoś innego.';
export const UPLOAD_ALREADY_FINISHED_MESSAGE = 'Przesyłanie tego slajdu już się zakończyło - lista została odświeżona.';

/** Someone else changed the slide since this user loaded it (optimistic concurrency, HTTP 409). */
export const isSlideModified = (error: unknown): boolean =>
  error instanceof ApiError && error.code === 'slide_modified';

export const isSlideGone = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

/** A user-facing (Polish) explanation of a failed rename/delete/cancel, conflicts first. */
export const describeSlideMutationError = (error: unknown, fallback: string): string => {
  if (isSlideModified(error)) return SLIDE_MODIFIED_MESSAGE;
  if (isSlideGone(error)) return SLIDE_GONE_MESSAGE;
  if (error instanceof ApiError && error.code === 'slide_not_uploading') return UPLOAD_ALREADY_FINISHED_MESSAGE;
  return getErrorMessage(error, fallback);
};
