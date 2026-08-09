/**
 * FT3-02 — RED specs for the WS status client (`CipraWsClient`), planned to land
 * in Slice 2 (F2-01 `lib/ws.ts`).
 *
 * SHAPE ASSUMED (locked here for F2-01 to honor):
 *   - `new CipraWsClient(url)` where url is the `/ws/status/` endpoint
 *   - status enum: `'disconnected' | 'connecting' | 'connected' | 'closed'`
 *   - callbacks via options: `{ onStatus(status, env), onEnvelope(env) }`
 *   - backoff: `backoffInitialMs` (default 500ms) doubled up to `backoffMaxMs`
 *     (default 10_000ms), reset to initial after a successful open
 *   - `connect()` opens; unexpected close schedules reconnect with backoff;
 *     `disconnect()` is user-initiated and cancels reconnection (status -> 'disconnected')
 *   - `validateEnvelope(raw)` mirrors backend `cipra_api/ws/protocol.py`:
 *     requires type/version/id/name/meta/payload, canonical types, `version === 1`,
 *     and (for gcode.ready) a non-empty `payload` string. Returns `{ ok: true }`
 *     or `{ ok: false, error: 'E_INVALID_ENVELOPE' | 'E_PROTOCOL_VERSION' }`.
 *
 * These tests fail (RED) today because lib/ws.ts does not exist; Slice 2 turns
 * them green. `WebSocket` is stubbed as a test double (AD-4, node environment).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  CipraWsClient,
  validateEnvelope,
  type ConnectionStatus,
  type Envelope,
} from './ws';

// --- Minimal WebSocket test double (no native WS impl under node). ---
class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public readyState = 0;
  public onopen: (() => void) | null = null;
  public onmessage: ((ev: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public sent: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.readyState = 3;
  }
}

function openMock(sock: MockWebSocket): void {
  sock.readyState = 1;
  sock.onopen?.();
}

function dropMock(sock: MockWebSocket): void {
  sock.readyState = 3;
  sock.onclose?.();
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function freshClient(url = 'ws://localhost:8000/ws/status/'): {
  client: CipraWsClient;
  statuses: ConnectionStatus[];
  envelopes: Envelope[];
} {
  const statuses: ConnectionStatus[] = [];
  const envelopes: Envelope[] = [];
  const client = new CipraWsClient(url, {
    backoffInitialMs: 500,
    backoffMaxMs: 10_000,
    onStatus: (s) => statuses.push(s),
    onEnvelope: (e) => envelopes.push(e),
  });
  return { client, statuses, envelopes };
}

describe('CipraWsClient · envelope validation (mirrors backend protocol.py)', () => {
  it('accepts a valid gcode.ready envelope', () => {
    const result = validateEnvelope({
      type: 'gcode.ready',
      version: 1,
      id: 'id-1',
      name: 'job',
      meta: {},
      payload: 'G0 X0 Y0\n',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects an envelope missing required fields (E_INVALID_ENVELOPE)', () => {
    const result = validateEnvelope({ type: 'gcode.ready', version: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E_INVALID_ENVELOPE');
  });

  it('rejects a malformed envelope (E_INVALID_ENVELOPE)', () => {
    const result = validateEnvelope({ nope: true });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E_INVALID_ENVELOPE');
  });

  it('rejects an unsupported protocol version (E_PROTOCOL_VERSION)', () => {
    const result = validateEnvelope({
      type: 'gcode.ready',
      version: 2,
      id: 'abc',
      name: '',
      meta: {},
      payload: 'G0 X0 Y0',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E_PROTOCOL_VERSION');
  });

  it('rejects a gcode.ready with an empty payload (E_INVALID_ENVELOPE)', () => {
    const result = validateEnvelope({
      type: 'gcode.ready',
      version: 1,
      id: 'id-2',
      name: 'job',
      meta: {},
      payload: '   ',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('E_INVALID_ENVELOPE');
  });
});

describe('CipraWsClient reconnect with backoff (fake timers)', () => {
  it('retries after an unexpected drop, doubling the delay 500 -> 1000ms', () => {
    vi.useFakeTimers();
    const { client } = freshClient();
    client.connect();

    expect(MockWebSocket.instances.length).toBe(1);
    dropMock(MockWebSocket.instances[0]);

    // First retry after `backoffInitialMs` = 500ms.
    vi.advanceTimersByTime(499);
    expect(MockWebSocket.instances.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances.length).toBe(2);

    // Second retry doubles to 1000ms.
    dropMock(MockWebSocket.instances[1]);
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances.length).toBe(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances.length).toBe(3);
  });

  it('caps backoff at backoffMaxMs (10_000)', () => {
    vi.useFakeTimers();
    const { client } = freshClient();
    client.connect();
    dropMock(MockWebSocket.instances[0]);
    vi.advanceTimersByTime(501); // now on 1000ms base
    dropMock(MockWebSocket.instances[1]);
    vi.advanceTimersByTime(2001); // now on 2000ms base
    dropMock(MockWebSocket.instances[2]);
    vi.advanceTimersByTime(4001); // now on 4000ms base
    dropMock(MockWebSocket.instances[3]);
    vi.advanceTimersByTime(8001); // next would be 8000 -> capped at 10_000
    expect(MockWebSocket.instances.length).toBe(6); // 1 + 1 + 1 + 1 + 1 + capped

    const beforeIdle = MockWebSocket.instances.length;
    dropMock(MockWebSocket.instances[5]);
    vi.advanceTimersByTime(9_999);
    expect(MockWebSocket.instances.length).toBe(beforeIdle); // not yet due
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances.length).toBe(beforeIdle + 1); // capped retry
  });

  it('resets backoff to base after a successful open', () => {
    vi.useFakeTimers();
    const { client } = freshClient();
    client.connect();
    dropMock(MockWebSocket.instances[0]);
    vi.advanceTimersByTime(501); // second attempt opens
    openMock(MockWebSocket.instances[1]);
    dropMock(MockWebSocket.instances[1]); // drop the now-open (stable) conn
    vi.advanceTimersByTime(499);
    expect(MockWebSocket.instances.length).toBe(2); // base 500ms, not 1000ms
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances.length).toBe(3);
  });
});

describe('CipraWsClient disconnect / status transitions', () => {
  it('reports disconnected -> connecting -> connected on connect/open', () => {
    vi.useFakeTimers();
    const { client, statuses } = freshClient();
    client.connect();
    expect(statuses[0]).toBe('connecting');
    openMock(MockWebSocket.instances[0]);
    expect(statuses[statuses.length - 1]).toBe('connected');
  });

  it('a user-initiated disconnect stops reconnecting (status disconnected)', () => {
    vi.useFakeTimers();
    const { client, statuses } = freshClient();
    client.connect();
    openMock(MockWebSocket.instances[0]);
    client.disconnect();
    expect(statuses[statuses.length - 1]).toBe('disconnected');

    // Waiting must not spawn new sockets after a manual disconnect.
    vi.advanceTimersByTime(60_000);
    expect(MockWebSocket.instances.length).toBe(1);
  });
});