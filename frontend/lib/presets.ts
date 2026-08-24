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
    auto_threshold: false,
  },
  line_art: {
    threshold: 180,
    simplify_tolerance: 0.5,
    variant: 'fast',
    scale: 1.0,
    auto_threshold: false,
  },
  sketch: {
    threshold: 150,
    simplify_tolerance: 1.0,
    variant: 'balanced',
    scale: 1.0,
    auto_threshold: false,
  },
  text: {
    threshold: 200,
    simplify_tolerance: 0.3,
    variant: 'fast',
    scale: 1.0,
    auto_threshold: false,
  },
};

export const IMAGE_TYPE_KEYS: Exclude<ImageType, 'custom'>[] = [
  'photo',
  'line_art',
  'sketch',
  'text',
];
