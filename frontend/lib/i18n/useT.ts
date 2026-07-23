'use client';

import { useContext } from 'react';
import { I18nContext, I18nContextValue } from './I18nProvider';
import { TranslateFn } from './types';

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

export function useT(): TranslateFn {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return ctx.t;
}
