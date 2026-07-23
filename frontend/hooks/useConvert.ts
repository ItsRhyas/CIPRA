'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConvertParams, ConvertResponse, Variant } from '@/lib/types';
import { convert as apiConvert } from '@/lib/api';

export type ConvertState = 'idle' | 'uploading' | 'success' | 'error';

export interface UseConvertReturn {
  state: ConvertState;
  result: ConvertResponse | null;
  error: string | null;
  convert: (image: File, params: ConvertParams & { variant: Variant }, fallbackError?: string) => Promise<void>;
  reset: () => void;
}

/**
 * State machine hook that drives the image-to-GCode conversion flow.
 *
 * States: idle -> uploading -> success | error
 *
 * Each call to `convert` aborts any in-flight request and increments a
 * request ID so stale responses are discarded. Aborting resolves cleanly
 * without changing state.
 */
export function useConvert(): UseConvertReturn {
  const [state, setState] = useState<ConvertState>('idle');
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('idle');
    setResult(null);
    setError(null);
  }, []);

  const convert = useCallback(
    async (
      image: File,
      params: ConvertParams & { variant: Variant },
      fallbackError = 'An unexpected error occurred'
    ) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      setState('uploading');
      setResult(null);
      setError(null);

      try {
        const response = await apiConvert(image, params, controller.signal);
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        if (response === null) {
          return;
        }
        setResult(response);
        setState('success');
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : fallbackError;
        setError(message);
        setState('error');
      }
    },
    []
  );

  return { state, result, error, convert, reset };
}
