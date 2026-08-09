export type Locale = 'en' | 'es';

export type Dictionary = Record<string, string>;

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>
) => string;
