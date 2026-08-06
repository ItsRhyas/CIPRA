/**
 * CIPRA WebSocket status client.
 *
 * Connects to the CIPRA-backend `/ws/status/` presence channel (F2-01) and
 * reconnects with exponential backoff. The status channel keeps the CIPRA UI's
 * connection/presence badge honest without ever counting as a bombolab
 * subscriber (design AD-1/AD-4).
 *
 * Framework-free so it runs inside vitest's `node` environment with a stubbed
 * `WebSocket` test double (`lib/ws.test.ts`). The envelope shape and error
 * codes mirror the backend `cipra_api/ws/protocol.py` canonical contract (AD-2).
 */

/** Presence channel path on the backend (single source of truth for the URL). */
export const STATUS_PATH = '/ws/status/';

/** Canonical envelope keys, mirroring backend `protocol.ENVELOPE_KEYS`. */
const ENVELOPE_KEYS = ['type', 'version', 'id', 'name', 'meta', 'payload'];

/** Canonical message types the status client accepts (includes `presence`). */
const CANONICAL_TYPES: ReadonlySet<string> = new Set<string>([
  'gcode.ready',
  'gcode.ack',
  'gcode.error',
  'no-job',
  'presence',
]);

const SCHEMA_VERSION = 1;

/** A validated transport envelope (canonical shape, R1). */
export interface Envelope {
  type: string;
  version: number;
  id: string;
  name: string;
  meta: Record<string, unknown>;
  payload: string;
}

export interface CipraWsClientOptions {
  /** Initial reconnect delay in ms (default 500). */
  backoffInitialMs?: number;
  /** Upper bound for the reconnect delay in ms (default 10000). */
  backoffMaxMs?: number;
  /** Fired whenever the connection status changes. */
  onStatus?: (status: ConnectionStatus, envelope?: Envelope) => void;
  /** Fired for every valid envelope received on the socket. */
  onEnvelope?: (envelope: Envelope) => void;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'closed';

/**
 * Build the `/ws/status/` URL from `location` (design: ws:// vs wss:// derived
 * from the page protocol). Falls back to localhost when invoked outside a
 * browser (node tests). Extractable so it can be tested as a pure function.
 */
export function buildStatusWsUrl(
  loc?: Partial<Pick<Location, 'protocol' | 'host'>>
): string {
  const protocol = loc?.protocol ?? 'http:';
  const wsScheme = protocol.startsWith('https') ? 'wss:' : 'ws:';
  const host = loc?.host || 'localhost:8000';
  return `${wsScheme}//${host}${STATUS_PATH}`;
}
type ValidationOk = { ok: true; error?: undefined };
type ValidationFail = {
  ok: false;
  error: 'E_INVALID_ENVELOPE' | 'E_PROTOCOL_VERSION';
};
type ValidationResult = ValidationOk | ValidationFail;
/** Validates an envelope against the backend protocol (mirrors protocol.py). */
export function validateEnvelope(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'E_INVALID_ENVELOPE' };
  }
  const message = raw as Record<string, unknown>;
  for (const key of ENVELOPE_KEYS) {
    if (!(key in message)) {
      return { ok: false, error: 'E_INVALID_ENVELOPE' };
    }
  }
  if (typeof message.type !== 'string' || !CANONICAL_TYPES.has(message.type)) {
    return { ok: false, error: 'E_INVALID_ENVELOPE' };
  }
  if (message.version !== SCHEMA_VERSION) {
    return { ok: false, error: 'E_PROTOCOL_VERSION' };
  }
  if (typeof message.id !== 'string' || message.id.length === 0) {
    return { ok: false, error: 'E_INVALID_ENVELOPE' };
  }
  if (message.type === 'gcode.ready') {
    const payload = message.payload;
    if (typeof payload !== 'string' || payload.trim().length === 0) {
      return { ok: false, error: 'E_INVALID_ENVELOPE' };
    }
  }
  return { ok: true };
}

/**
 * Reconnecting client for the CIPRA `/ws/status/` channel.
 *
 * Lifecycle: `connect()` opens a socket; an unexpected close schedules a
 * reconnect with exponential backoff (X2, capped at `backoffMaxMs`, reset on a
 * successful open); `disconnect()` is user-initiated and cancels reconnection.
 */
export class CipraWsClient {
  private readonly url: string;
  private readonly options: Required<CipraWsClientOptions>;

  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 0;
  private manualDisconnect = false;
  private status: ConnectionStatus = 'disconnected';

  constructor(url: string, options: CipraWsClientOptions = {}) {
    this.url = url;
    this.options = {
      backoffInitialMs: options.backoffInitialMs ?? 500,
      backoffMaxMs: options.backoffMaxMs ?? 10_000,
      onStatus: options.onStatus ?? (() => {}),
      onEnvelope: options.onEnvelope ?? (() => {}),
    };
    this.backoff = this.options.backoffInitialMs;
  }

  /** Open a connection (idempotent while a socket is already active). */
  connect(): void {
    this.manualDisconnect = false;
    if (this.socket) {
      return;
    }
    this.attempt();
  }

  /** User-initiated disconnect: cancels reconnection and moves to `disconnected`. */
  disconnect(): void {
    this.manualDisconnect = true;
    this.clearTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Open a socket. If it does not reach `open` within `delayMs` (the delay that
   * led to this attempt), the attempt is treated as failed and retried with a
   * doubled backoff. An explicit close cancels that pending attempt and
   * schedules the next retry instead.
   */
  private attempt(delayMs?: number): void {
    if (this.manualDisconnect) {
      return;
    }
    this.setStatus('connecting');

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      this.clearTimer();
      this.backoff = this.options.backoffInitialMs;
      this.setStatus('connected');
    };

    socket.onmessage = (event: MessageEvent) => {
      const envelope = this.parseFrame(event.data);
      if (envelope === null) {
        return;
      }
      const validation = validateEnvelope(envelope);
      if (validation.ok) {
        this.options.onEnvelope(envelope as Envelope);
      }
    };

    socket.onclose = () => {
      this.socket = null;
      this.clearTimer();
      if (this.manualDisconnect) {
        this.setStatus('disconnected');
        return;
      }
      this.setStatus('closed');
      this.scheduleRetry();
    };

    this.armAttemptTimeout(socket, delayMs ?? this.backoff);

    // Errors are followed by `close`; the reconnect path handles them.
    socket.onerror = () => {};
  }

  /**
   * If `socket` has not opened within `delayMs`, treat it as a failed
   * connection attempt: double the backoff and try again immediately.
   */
  private armAttemptTimeout(socket: WebSocket, delayMs: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      if (this.socket !== socket) {
        return; // superseded by another attempt or a manual disconnect
      }
      this.socket = null;
      this.setStatus('closed');
      this.backoff = Math.min(this.backoff * 2, this.options.backoffMaxMs);
      this.attempt();
    }, delayMs);
  }

  /** Exponential backoff: schedule the next attempt after the current delay. */
  private scheduleRetry(): void {
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, this.options.backoffMaxMs);
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.attempt(delay);
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private parseFrame(data: unknown): unknown {
    if (typeof data !== 'string') {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private setStatus(next: ConnectionStatus): void {
    this.status = next;
    this.options.onStatus(next);
  }
}