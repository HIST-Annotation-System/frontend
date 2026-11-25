import type { Slide } from '../../../types/slide';

/** Who is uploading / who added the slide, so admins working at the same time don't trip over each other. */
export const describeUploader = (
  slide: Pick<Slide, 'status' | 'uploaded_by'>,
  currentUsername: string | null | undefined,
): string | null => {
  if (!slide.uploaded_by) return null;
  const who = slide.uploaded_by === currentUsername ? `${slide.uploaded_by} (Ty)` : slide.uploaded_by;
  return slide.status === 'uploading' ? `Wgrywa: ${who}` : `Dodane przez: ${who}`;
};
