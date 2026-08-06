/**
 * FT3-02 — RED specs for `publish()` in `lib/api.ts` (landed later in F2-02).
 *
 * Maps to R6 / design: `publish()` POSTs `/api/v1/gcode/publish/` and returns a
 * `{ published, connected, job_id }` result. Re-publishing the current snapshot
 * is idempotent (same job_id); the backend is the source of truth and the button
 * is pure HTTP (no WS publish from the CIPRA frontend). A non-2xx response
 * (e.g. 404 E_NO_JOB, or other 4xx) raises `ApiError` with the parsed body.
 *
 * `fetch` is mocked via `vi.stubGlobal` because vitest runs under node (AD-4).
 * These tests fail (RED) today because `publish()` does not exist yet.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { publish, ApiError } from './api';

const PUBLISH_URL = '/api/v1/gcode/publish/';

function mockFetchResponse(
  body: { published?: boolean; connected?: boolean; job_id?: string | null } = {}
): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function mockFetchError(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('publish() · payload & URL', () => {
  it('POSTs to the publish endpoint (no body) and returns the parsed result', async () => {
    const fetchMock = mockFetchResponse({
      published: true,
      connected: true,
      job_id: 'job-1',
    });

    const result = await publish();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(PUBLISH_URL);
    expect(init).toMatchObject({ method: 'POST' });
    expect(result).toEqual({
      published: true,
      connected: true,
      job_id: 'job-1',
    });
  });

  it('surfaces the not-connected no-op result when there is no client', async () => {
    const fetchMock = mockFetchResponse({
      published: true,
      connected: false,
      job_id: 'job-1',
    });
    const result = await publish();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      published: true,
      connected: false,
      job_id: 'job-1',
    });
  });
});

describe('publish() · idempotent re-publish (R6)', () => {
  it('republishing keeps the same job_id (idempotent)', async () => {
    const fetchMock = mockFetchResponse({
      published: true,
      connected: true,
      job_id: 'job-1',
    });

    const first = await publish();
    const second = await publish();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.job_id).toBe('job-1');
    expect(second.job_id).toBe('job-1');
    expect(first).toEqual(second);
  });

  it('returns { published:false } when no snapshot exists', async () => {
    mockFetchResponse({ published: false, connected: false, job_id: null });
    const result = await publish();
    expect(result).toEqual({ published: false, connected: false, job_id: null });
  });
});

describe('publish() · error handling on 4xx / 404', () => {
  it('raises ApiError with the parsed body when the backend returns 404', async () => {
    const fetchMock = mockFetchError(404, { error: 'E_INVALID' });

    await expect(publish()).rejects.toBeInstanceOf(ApiError);
    const err = await publish().catch((e: unknown) => e) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ error: 'E_INVALID' });
    expect(fetchMock).toHaveBeenCalledWith(
      PUBLISH_URL,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('raises an ApiError on an arbitrary 4xx/5xx response', async () => {
    mockFetchError(500, { error: 'E_NO_JOB' });
    const err = (await publish().catch((e: ApiError) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.body).toEqual({ error: 'E_NO_JOB' });
  });
});