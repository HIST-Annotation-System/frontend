import { useEffect, useState } from 'react';
import { getBoxFeatures } from '../../../services/hotspotsApi';
import type { BoxFeatures } from '../../../types/hotspot';
import { boxKey, MAX_BATCH_BOXES, type Box } from '../utils/hotspotBoxes';

export type BoxFeatureValues = BoxFeatures['features'];

/** How long the boxes must stay the same before their stats are asked for (a drag changes them constantly). */
const FETCH_DELAY_MS = 250;

/** Stats already computed, per slide and box: a box's stats never change, so they are kept for the whole visit. */
const known = new Map<string, Map<string, BoxFeatureValues>>();

const knownFor = (slideId: string): Map<string, BoxFeatureValues> => {
  let boxes = known.get(slideId);
  if (!boxes) {
    boxes = new Map();
    known.set(slideId, boxes);
  }
  return boxes;
};

/**
 * Live image stats (the catalog's sort features) of slide boxes before they are cut out. Boxes whose stats are
 * missing are asked for once the boxes stop changing for a moment; a newer set of boxes cancels the older request.
 */
export function useBoxFeatures(slideId: string, boxes: readonly Box[]) {
  const [, setFetched] = useState(0);
  const [failed, setFailed] = useState(false);
  const features = knownFor(slideId);
  const missing = boxes.filter((box) => !features.has(boxKey(box)));
  const missingKeys = missing.map(boxKey).join(';');

  useEffect(() => {
    if (!missingKeys) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const corners = missingKeys.split(';').map((key) => key.split(',').map(Number) as [number, number]);
      try {
        for (let start = 0; start < corners.length; start += MAX_BATCH_BOXES) {
          const result = await getBoxFeatures(
            { slide_id: slideId, boxes: corners.slice(start, start + MAX_BATCH_BOXES) },
            controller.signal,
          );
          const target = knownFor(slideId);
          result.forEach((item) => target.set(boxKey(item), item.features));
          setFetched((count) => count + 1);
        }
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }, FETCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [slideId, missingKeys]);

  return { features, pending: missing.length > 0 && !failed, failed };
}
