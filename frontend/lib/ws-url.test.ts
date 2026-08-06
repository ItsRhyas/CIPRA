/**
 * F2-03 — RED/GREEN specs for `buildStatusWsUrl` (pure URL helper used by the
 * `useGcodeWs` hook to reach the CIPRA `/ws/status/` presence channel).
 *
 * The helper mirrors the design: the WS scheme derives from the page protocol
 * (`http:` -> `ws:`, `https:` -> `wss:`) with a localhost fallback outside a
 * browser. Pure function — no DOM required (AD-4 node environment).
 */

import { describe, it, expect } from 'vitest';

import { buildStatusWsUrl } from './ws';

describe('buildStatusWsUrl', () => {
  it('builds a ws:// URL for an http page', () => {
    expect(buildStatusWsUrl({ protocol: 'http:', host: 'localhost:3000' })).toBe(
      'ws://localhost:3000/ws/status/'
    );
  });

  it('builds a wss:// URL for an https page', () => {
    expect(buildStatusWsUrl({ protocol: 'https:', host: 'cipra.example.com' })).toBe(
      'wss://cipra.example.com/ws/status/'
    );
  });

  it('falls back to the backend host when location is unavailable (node)', () => {
    expect(buildStatusWsUrl(undefined)).toBe('ws://localhost:8000/ws/status/');
  });
});
