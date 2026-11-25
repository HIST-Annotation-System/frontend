// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { annotationQueryKeys, deleteAnnotation, updateAnnotation } from '../../../services/annotationsApi';
import { ApiError } from '../../../services/httpClient';
import type { Annotation, AnnotationOwner } from '../../../types/annotation';
import { useAnnotationMutations } from './useAnnotations';

vi.mock('../../../services/annotationsApi', async (original) => ({
  ...(await original<typeof import('../../../services/annotationsApi')>()),
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  listAnnotations: vi.fn(async () => []),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const owner: AnnotationOwner = { type: 'hotspots', id: 'h1' };
const cell = (id: string, classId = 'a'): Annotation =>
  ({ id, kind: 'cell', class_id: classId, geometry: { type: 'Polygon', coordinates: [] } }) as unknown as Annotation;

/** A request the test finishes by hand, to hold it open while the next edit is made. */
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAnnotationMutations', () => {
  let client: QueryClient;
  let mutations: ReturnType<typeof useAnnotationMutations>;
  let unmount: () => void;

  const cached = () => client.getQueryData<Annotation[]>(annotationQueryKeys.forOwner(owner)) ?? [];
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

  beforeEach(() => {
    vi.mocked(updateAnnotation).mockReset();
    vi.mocked(deleteAnnotation).mockReset();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(annotationQueryKeys.forOwner(owner), [cell('1'), cell('2'), cell('3')]);
    function Probe(): ReactNode {
      const current = useAnnotationMutations(owner);
      useEffect(() => {
        mutations = current;
      });
      return null;
    }
    const root = createRoot(document.createElement('div'));
    act(() => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      );
    });
    unmount = () => act(() => root.unmount());
  });

  afterEach(() => unmount());

  it('shows an edit before the server answers, without moving the row', async () => {
    const request = pending<Annotation>();
    vi.mocked(updateAnnotation).mockReturnValue(request.promise);
    const saving = mutations.updateAnnotation({ id: '2', changes: { class_id: 'b' } });
    await settle();
    expect(cached().map((item) => [item.id, item.class_id])).toEqual([
      ['1', 'a'],
      ['2', 'b'],
      ['3', 'a'],
    ]);
    request.resolve({ ...cell('2', 'b'), created_by_name: 'ania' });
    await act(() => saving);
    expect(cached().map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(cached()[1].created_by_name).toBe('ania');
  });

  it('puts the annotation back when an edit fails', async () => {
    vi.mocked(updateAnnotation).mockRejectedValue(new ApiError('nope', 500));
    await act(() => expect(mutations.updateAnnotation({ id: '2', changes: { class_id: 'b' } })).rejects.toThrow());
    expect(cached()[1].class_id).toBe('a');
  });

  it('takes a deleted annotation off at once, and restores it in place when the request fails', async () => {
    const request = pending<void>();
    vi.mocked(deleteAnnotation).mockReturnValue(request.promise);
    const deleting = mutations.deleteAnnotation('2');
    expect(cached().map((item) => item.id)).toEqual(['1', '3']);
    request.reject(new ApiError('nope', 500));
    await act(() => expect(deleting).rejects.toThrow());
    expect(cached().map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('treats deleting an annotation that is already gone as success', async () => {
    vi.mocked(deleteAnnotation).mockRejectedValue(new ApiError('does not exist', 404));
    await act(() => mutations.deleteAnnotation('2'));
    expect(cached().map((item) => item.id)).toEqual(['1', '3']);
  });

  it('does not bring back an annotation deleted while its edit was saving', async () => {
    const edit = pending<Annotation>();
    vi.mocked(updateAnnotation).mockReturnValue(edit.promise);
    vi.mocked(deleteAnnotation).mockResolvedValue(undefined);
    const saving = mutations.updateAnnotation({ id: '2', changes: { class_id: 'b' } });
    await settle();
    const deleting = mutations.deleteAnnotation('2');
    await settle();
    expect(deleteAnnotation).not.toHaveBeenCalled(); // One at a time, in the order made.
    edit.resolve(cell('2', 'b'));
    await act(async () => {
      await saving;
      await deleting;
    });
    expect(deleteAnnotation).toHaveBeenCalledTimes(1);
    expect(cached().map((item) => item.id)).toEqual(['1', '3']);
  });

  it('keeps showing the newer of two quick edits while the older one is answered', async () => {
    const first = pending<Annotation>();
    const second = pending<Annotation>();
    vi.mocked(updateAnnotation).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const saving = [
      mutations.updateAnnotation({ id: '2', changes: { class_id: 'b' } }),
      mutations.updateAnnotation({ id: '2', changes: { class_id: 'c' } }),
    ];
    await settle();
    first.resolve(cell('2', 'b'));
    await act(() => saving[0]);
    expect(cached()[1].class_id).toBe('c');
    await settle();
    second.resolve(cell('2', 'c'));
    await act(() => saving[1]);
    expect(cached()[1].class_id).toBe('c');
  });
});
