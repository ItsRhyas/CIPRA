'use client';

import React from 'react';
import { I18nProvider } from '@/lib/i18n/I18nProvider';

interface I18nProviderWrapperProps {
  children: React.ReactNode;
}

export function I18nProviderWrapper({ children }: I18nProviderWrapperProps) {
  return <I18nProvider>{children}</I18nProvider>;
}
