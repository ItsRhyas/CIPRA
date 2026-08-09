'use client';

import React from 'react';
import type { ConnectionStatus } from '@/lib/ws';

/**
 * Badge presentation for a connection status: Spanish UI copy plus an
 * accessibility description (design AD-4 — always a banner, never a modal).
 */
export interface BadgePresentation {
  label: string;
  description: string;
  dotClass: string;
}

const BADGE_PRESENTATIONS: Record<ConnectionStatus, BadgePresentation> = {
  disconnected: {
    label: 'Sin conexión',
    description: 'Sin conexión con el servidor CIPRA',
    dotClass: 'bg-red-500',
  },
  connecting: {
    label: 'Conectando',
    description: 'Conectando con el servidor CIPRA',
    dotClass: 'bg-amber-500',
  },
  connected: {
    label: 'En línea',
    description: 'Conectado al servidor CIPRA',
    dotClass: 'bg-emerald-500',
  },
  closed: {
    label: 'Sin conexión',
    description: 'Conexión cerrada; se reintentará automáticamente',
    dotClass: 'bg-red-500',
  },
};

/**
 * Pure status -> label/description mapping, kept separate so it can be unit
 * tested without a DOM (AD-4). Capitalized label + status role imply meaning.
 */
export function getBadgePresentation(
  status: ConnectionStatus
): BadgePresentation {
  return BADGE_PRESENTATIONS[status];
}

export interface ConnectionBadgeProps {
  status: ConnectionStatus;
  /** Number of connected bombolab subscribers (from a `presence` envelope). */
  clients?: number;
}

/**
 * Small inline badge surfacing CIPRA's connection state. Uses `role="status"`
 * so assistive tech announces changes without stealing focus.
 */
export function ConnectionBadge({
  status,
  clients = 0,
}: ConnectionBadgeProps) {
  const presentation = getBadgePresentation(status);
  const presence =
    status === 'connected' && clients > 0
      ? ` · ${clients} ${clients === 1 ? 'dispositivo' : 'dispositivos'}`
      : '';

  return (
    <span
      role="status"
      aria-label={presentation.description}
      className="inline-flex items-center gap-2 rounded-full border border-ci-rule bg-ci-surface px-3 py-1 font-body text-sm font-medium tracking-precise text-ci-muted"
    >
      <span
        aria-hidden="true"
        className={`inline-block h-2.5 w-2.5 rounded-full ${presentation.dotClass}`}
      />
      <span>
        {presentation.label}
        {presence}
      </span>
    </span>
  );
}