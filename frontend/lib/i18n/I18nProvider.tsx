'use client';

import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Dictionary, Locale, TranslateFn } from './types';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';

const STORAGE_KEY = 'cipra-lang';
const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, Dictionary> = { en, es };

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read persisted locale on mount. An invalid stored value falls back to
  // English and is overwritten. Server-rendered html[lang="en"] may be visible
  // for a single frame before this effect corrects it for returning users.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') {
        setLocaleState(stored);
      } else if (stored) {
        localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
      }
    } catch {
      // localStorage is unavailable in some private browsing modes.
    }
  }, []);

  // Sync <html lang> and persistence whenever the active locale changes.
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore storage errors.
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dict = dictionaries[locale];
      let str = dict[key] ?? key;

      if (str === key && process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing key "${key}" for locale "${locale}"`);
      }

      if (vars) {
        str = str.replace(/\{(\w+)\}/g, (_, k) =>
          String(vars[k] ?? `{${k}}`)
        );
      }

      return str;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
