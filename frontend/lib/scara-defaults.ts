import { ConvertParams, Variant } from '@/lib/types';

/**
 * Default conversion parameters for the CIPRA frontend.
 * Threshold and simplify_tolerance are aligned with the backend defaults
 * rather than the stale values in shared/api-contract.json.
 */
export const DEFAULTS: ConvertParams & { variant: Variant } = {
  scale: 1.0,
  threshold: 128,
  simplify_tolerance: 2.0,
  variant: 'balanced',
};
