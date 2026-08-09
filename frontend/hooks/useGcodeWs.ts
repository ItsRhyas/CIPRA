'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CipraWsClient,
  buildStatusWsUrl,
  type ConnectionStatus,
  type Envelope,
} from '@/lib/ws';
import { publish as apiPublish, type PublishResult } from '@/lib/api';

/**
 * Connection + publish hook for the webSocket `/ws/status/` presence channel.
 *
 * Exposes the connection status, the latest bombolab `clients` count, the most
 * recent `gcode.ack` id, and a `publish()` action (R6) that re-publishes the
 * current snapshot. The client auto-reconnects with exponential backoff and is
 * torn down on unmount.
 */
export interface UseGcodeWsReturn {
  status: ConnectionStatus;
  clients: number;
  lastAck: string | null;
  publishError: string | null;
  publish: () => Promise<PublishResult>;
}

export function useGcodeWs(): UseGcodeWsReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [clients, setClients] = useState(0);
  const [lastAck, setLastAck] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    const client = new CipraWsClient(buildStatusWsUrl(), {
      backoffInitialMs: 500,
      backoffMaxMs: 10_000,
      onStatus: (next) => setStatus(next),
      onEnvelope: (envelope: Envelope) => {
        if (envelope.type === 'presence') {
          const count = envelope.meta?.clients;
          setClients(typeof count === 'number' ? count : 0);
        } else if (envelope.type === 'gcode.ack') {
          setLastAck(envelope.id);
        }
      },
    });
    client.connect();
    return () => client.disconnect();
  }, []);

  const publish = useCallback(async () => {
    setPublishError(null);
    try {
      return await apiPublish();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setPublishError(message);
      throw err;
    }
  }, []);

  return { status, clients, lastAck, publish, publishError };
}