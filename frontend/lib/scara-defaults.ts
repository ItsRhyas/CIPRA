import { ConvertParams, Variant } from '@/lib/types';

/**
 * Default conversion parameters for the CIPRA frontend.
 * Threshold and simplify_tolerance are aligned with the backend defaults
 * rather than the stale values in shared/api-contract.json.
 */
export const DEFAULTS: ConvertParams & { variant: Variant } = {
  scale: 1.0,
  threshold: 128,
  simplify_tolerance: 1.0,
  variant: 'balanced',
  scara: {
    work_area_w_mm: 210,
    work_area_h_mm: 297,
    travel_speed: undefined,
    draw_speed: undefined,
  },
  rotation_deg: 0,
  flip_h: false,
  flip_v: false,
};
