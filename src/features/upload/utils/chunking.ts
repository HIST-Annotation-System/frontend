/** Smallest part we upload: big enough to keep per-request overhead low, small enough that a retry
 * after a dropped connection resends little and progress moves smoothly. S3's own minimum is 5 MB. */
export const MIN_PART_SIZE = 16 * 1024 * 1024;
/** S3 limit on the number of parts in one multipart upload. */
export const MAX_PARTS = 10_000;

export interface PartRange {
  partNumber: number;
  start: number;
  end: number;
}

export const choosePartSize = (fileSize: number): number => Math.max(MIN_PART_SIZE, Math.ceil(fileSize / MAX_PARTS));

/** 1-based S3 parts covering the whole file; an empty file still gets one (empty) part. */
export const splitIntoParts = (fileSize: number, partSize: number): PartRange[] => {
  const count = Math.max(1, Math.ceil(fileSize / partSize));
  return Array.from({ length: count }, (_, index) => ({
    partNumber: index + 1,
    start: index * partSize,
    end: Math.min((index + 1) * partSize, fileSize),
  }));
};
