import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/httpClient';
import { isRetryable, waitReason } from './useSlideImage';

describe('waiting for a slide image', () => {
  it('a slide being copied to the server is retried and said so', () => {
    const error = new ApiError('copying', 503, 'slide_preparing');
    expect(isRetryable(error)).toBe(true);
    expect(waitReason(error)).toBe('copying');
  });

  it.each([502, 503, 504])('an unavailable server (%i) is retried without claiming a copy', (status) => {
    const error = new ApiError('Bad gateway', status);
    expect(isRetryable(error)).toBe(true);
    expect(waitReason(error)).toBe('server');
  });

  it.each([new ApiError('gone', 404), new ApiError('full', 507), new ApiError('offline'), new Error('boom'), null])(
    'anything else is a plain error (%s)',
    (error) => {
      expect(isRetryable(error)).toBe(false);
      expect(waitReason(error)).toBeNull();
    },
  );
});
