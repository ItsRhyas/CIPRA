import { ConvertParams, Variant } from '@/lib/types';

export type ImageType = 'photo' | 'line_art' | 'sketch' | 'text' | 'custom';

export const IMAGE_TYPE_PRESETS: Record<
  Exclude<ImageType, 'custom'>,
  Partial<ConvertParams & { variant: Variant }>
> = {
  photo: {
    threshold: 100,
    simplify_tolerance: 2.0,
    variant: 'balanced',
    scale: 1.0,
  },
  line_art: {
    threshold: 180,
    simplify_tolerance: 0.5,
    variant: 'fast',
    scale: 1.0,
  },
  sketch: {
    threshold: 150,
    simplify_tolerance: 1.0,
    variant: 'balanced',
    scale: 1.0,
  },
  text: {
    threshold: 200,
    simplify_tolerance: 0.3,
    variant: 'fast',
    scale: 1.0,
  },
};

export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  photo: 'Photo',
  line_art: 'Line Art',
  sketch: 'Sketch',
  text: 'Text',
  custom: 'Custom',
};
