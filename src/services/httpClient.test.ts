import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiUrl, httpClient } from './httpClient';

type Reply = { status: number; data?: unknown };

/** Routes requests to canned replies by URL; a list of replies is consumed one per call. */
const serve = (routes: Record<string, Reply | Reply[]>) => {
  const calls: string[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    calls.push(url);
    const route = routes[url];
    const reply = Array.isArray(route) ? (route.shift() ?? { status: 500 }) : (route ?? { status: 404 });
    const response: AxiosResponse = {
      data: reply.data ?? null,
      status: reply.status,
      statusText: String(reply.status),
      headers: {},
      config,
    };
    if (reply.status >= 400) {
      throw new AxiosError(`Request failed with status code ${reply.status}`, 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };
  httpClient.defaults.adapter = adapter;
  return calls;
};

let originalAdapter: typeof httpClient.defaults.adapter;

beforeEach(() => {
  originalAdapter = httpClient.defaults.adapter;
});

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
});

describe('error conversion', () => {
  it('turns the backend detail and code into an ApiError', async () => {
    serve({ '/slides/1': { status: 409, data: { detail: 'Changed meanwhile', code: 'slide_modified' } } });
    const error = await httpClient.get('/slides/1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Changed meanwhile', status: 409, code: 'slide_modified' });
  });

  it('joins validation issues', async () => {
    serve({ '/x': { status: 422, data: { detail: [{ msg: 'name required' }, { msg: 'too long' }] } } });
    await expect(httpClient.post('/x')).rejects.toMatchObject({ message: 'name required; too long', code: null });
  });

  it('reads the detail out of a blob error body', async () => {
    const body = new Blob([JSON.stringify({ detail: 'No such tile' })], { type: 'application/json' });
    serve({ '/tile': { status: 404, data: body } });
    await expect(httpClient.get('/tile')).rejects.toMatchObject({ message: 'No such tile', status: 404 });
  });

  it('falls back to the transport message without a backend body', async () => {
    serve({ '/x': { status: 502, data: '<html>bad gateway</html>' } });
    await expect(httpClient.get('/x')).rejects.toMatchObject({
      message: 'Request failed with status code 502',
      status: 502,
    });
  });
});

describe('session refresh', () => {
  it('refreshes the session once and repeats the request', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const calls = serve({ '/me': [{ status: 401 }, { status: 200, data: { id: 1 } }] });
    const response = await httpClient.get('/me');
    expect(response.data).toEqual({ id: 1 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0][0]).toMatch(/\/auth\/refresh$/);
    expect(calls).toEqual(['/me', '/me']);
  });

  it('does not refresh for the login and refresh endpoints', async () => {
    const refresh = vi.spyOn(axios, 'post');
    serve({ '/auth/login': { status: 401, data: { detail: 'Bad credentials' } } });
    await expect(httpClient.post('/auth/login')).rejects.toMatchObject({ message: 'Bad credentials', status: 401 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('gives up when the refresh fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh token expired'));
    const calls = serve({ '/me': { status: 401 } });
    await expect(httpClient.get('/me')).rejects.toMatchObject({ message: 'refresh token expired' });
    expect(calls).toEqual(['/me']);
  });

  it('does not loop when the repeated request is refused again', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    serve({ '/me': [{ status: 401 }, { status: 401, data: { detail: 'Still no' } }] });
    await expect(httpClient.get('/me')).rejects.toMatchObject({ message: 'Still no', status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('lets requests refused during a refresh wait for it instead of refreshing again', async () => {
    let finishRefresh!: () => void;
    const refresh = vi.spyOn(axios, 'post').mockImplementation(
      () => new Promise((resolve) => (finishRefresh = () => resolve({ data: {} }))),
    );
    serve({
      '/a': [{ status: 401 }, { status: 200, data: 'a' }],
      '/b': [{ status: 401 }, { status: 200, data: 'b' }],
    });
    const a = httpClient.get('/a');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const b = httpClient.get('/b');
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishRefresh();
    expect([(await a).data, (await b).data]).toEqual(['a', 'b']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('apiUrl', () => {
  it('builds absolute URLs with encoded query parameters', () => {
    expect(apiUrl('/slides/1/tile')).toMatch(/^https?:\/\/.+\/slides\/1\/tile$/);
    expect(apiUrl('/x', { level: 3, name: 'a b&c' })).toMatch(/\/x\?level=3&name=a\+b%26c$/);
  });
});
