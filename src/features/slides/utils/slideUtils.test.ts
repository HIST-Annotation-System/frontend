import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/httpClient';
import type { Slide } from '../../../types/slide';
import {
  SLIDE_GONE_MESSAGE,
  SLIDE_MODIFIED_MESSAGE,
  UPLOAD_ALREADY_FINISHED_MESSAGE,
  describeSlideMutationError,
  isSlideGone,
  isSlideModified,
} from './slideConflicts';
import { sortSlides } from './slideSort';
import { describeUploader } from './slideUploader';

const slide = (name: string, created_at: string): Slide => ({ name, created_at }) as Slide;

describe('sortSlides', () => {
  const slides = [slide('Żaba', '2026-01-02'), slide('anna', '2026-01-03'), slide('Ćma', '2026-01-01')];

  it('keeps the server order without a sort', () => {
    expect(sortSlides(slides, null)).toBe(slides);
  });

  it('sorts names the Polish way', () => {
    expect(sortSlides(slides, { key: 'name', descending: false }).map((s) => s.name)).toEqual(['anna', 'Ćma', 'Żaba']);
    expect(sortSlides(slides, { key: 'name', descending: true }).map((s) => s.name)).toEqual(['Żaba', 'Ćma', 'anna']);
  });

  it('sorts by creation time without changing the input', () => {
    const sorted = sortSlides(slides, { key: 'created_at', descending: true });
    expect(sorted.map((s) => s.created_at)).toEqual(['2026-01-03', '2026-01-02', '2026-01-01']);
    expect(slides[0].name).toBe('Żaba');
  });
});

describe('slide mutation errors', () => {
  it('recognises conflicts', () => {
    expect(isSlideModified(new ApiError('x', 409, 'slide_modified'))).toBe(true);
    expect(isSlideModified(new ApiError('x', 409, 'other'))).toBe(false);
    expect(isSlideGone(new ApiError('x', 404))).toBe(true);
    expect(isSlideGone(new Error('404'))).toBe(false);
  });

  it.each([
    [new ApiError('x', 409, 'slide_modified'), SLIDE_MODIFIED_MESSAGE],
    [new ApiError('x', 404, 'slide_not_found'), SLIDE_GONE_MESSAGE],
    [new ApiError('x', 409, 'slide_not_uploading'), UPLOAD_ALREADY_FINISHED_MESSAGE],
    [new ApiError('Server says no', 500), 'Server says no'],
    [new ApiError('', 500), 'fallback'],
    ['not an error', 'fallback'],
  ])('explains %s', (error, message) => {
    expect(describeSlideMutationError(error, 'fallback')).toBe(message);
  });
});

describe('describeUploader', () => {
  it('says who is uploading or who added the slide', () => {
    expect(describeUploader({ status: 'uploading', uploaded_by: 'anna' }, 'bob')).toBe('Wgrywa: anna');
    expect(describeUploader({ status: 'ready', uploaded_by: 'anna' }, 'bob')).toBe('Dodane przez: anna');
  });

  it('marks the current user', () => {
    expect(describeUploader({ status: 'ready', uploaded_by: 'anna' }, 'anna')).toBe('Dodane przez: anna (Ty)');
  });

  it('says nothing for slides without an uploader', () => {
    expect(describeUploader({ status: 'ready', uploaded_by: null }, 'anna')).toBeNull();
  });
});
