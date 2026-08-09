'use client';

import React, { memo } from 'react';
import { I18nProvider } from '@/lib/i18n/I18nProvider';

interface I18nProviderWrapperProps {
  children: React.ReactNode;
}

export const I18nProviderWrapper = memo(function I18nProviderWrapper({
  children,
}: I18nProviderWrapperProps) {
  return <I18nProvider>{children}</I18nProvider>;
});
