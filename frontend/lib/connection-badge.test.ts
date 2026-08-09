/**
 * F2-04 — specs for the ConnectionBadge label mapping (extracted pure helper).
 *
 * The badge shows Spanish UI copy with a status role; the pure function below
 * maps each connection status to its label + a11y description without touching
 * DOM/Tailwind classes (AD-4 node environment, no jsdom).
 */

import { describe, it, expect } from 'vitest';

import { getBadgePresentation } from '@/components/ConnectionBadge';

describe('getBadgePresentation', () => {
  it('labels an established connection as "En línea"', () => {
    const p = getBadgePresentation('connected');
    expect(p.label).toBe('En línea');
  });

  it('labels an in-progress connection as "Conectando"', () => {
    const p = getBadgePresentation('connecting');
    expect(p.label).toBe('Conectando');
  });

  it('labels both closed states as "Sin conexión"', () => {
    expect(getBadgePresentation('disconnected').label).toBe('Sin conexión');
    expect(getBadgePresentation('closed').label).toBe('Sin conexión');
  });

  it('provides an accessibility description for every status', () => {
    for (const status of ['disconnected', 'connecting', 'connected', 'closed'] as const) {
      expect(getBadgePresentation(status).description.length).toBeGreaterThan(0);
    }
  });
});
