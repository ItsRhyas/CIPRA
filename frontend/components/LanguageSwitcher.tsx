'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/useT';
import { Locale } from '@/lib/i18n/types';

const LOCALES: Locale[] = ['en', 'es'];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center rounded-full border border-ci-rule bg-ci-surface p-1">
      {LOCALES.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 font-body text-xs font-medium transition-colors focus-ring ${
              active
                ? 'bg-ci-accent text-white'
                : 'text-ci-muted hover:text-ci-text'
            }`}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
