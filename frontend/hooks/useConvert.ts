'use client';

import { useCallback, useState } from 'react';
import { ConvertParams, ConvertResponse, Variant } from '@/lib/types';
import { convert as apiConvert } from '@/lib/api';

export type ConvertState = 'idle' | 'uploading' | 'success' | 'error';

export interface UseConvertReturn {
  state: ConvertState;
  result: ConvertResponse | null;
  error: string | null;
  imageUrl: string | null;
  convert: (image: File, params: ConvertParams & { variant: Variant }) => Promise<void>;
  reset: () => void;
}

/**
 * State machine hook that drives the image-to-GCode conversion flow.
 *
 * States: idle -> uploading -> success | error
 * The hook creates an object URL for the selected image so the canvas preview
 * can render it without re-reading the File object.
 */
export function useConvert(): UseConvertReturn {
  const [state, setState] = useState<ConvertState>('idle');
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const reset = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setState('idle');
    setResult(null);
    setError(null);
    setImageUrl(null);
  }, [imageUrl]);

  const convert = useCallback(
    async (image: File, params: ConvertParams & { variant: Variant }) => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      setState('uploading');
      setResult(null);
      setError(null);

      const url = URL.createObjectURL(image);
      setImageUrl(url);

      try {
        const response = await apiConvert(image, params);
        setResult(response);
        setState('success');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        setState('error');
      }
    },
    [imageUrl]
  );

  return { state, result, error, imageUrl, convert, reset };
}
