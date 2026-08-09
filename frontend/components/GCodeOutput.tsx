'use client';

import React, { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { EmptyState } from '@/components/EmptyState';

export interface GCodeOutputProps {
  gcode: string | null;
}

type CopyState = 'idle' | 'copied' | 'error';

export function GCodeOutput({ gcode }: GCodeOutputProps) {
  const t = useT();
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), 1500);
    return () => clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    if (!gcode) return;
    try {
      await navigator.clipboard.writeText(gcode);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const handleDownload = () => {
    if (!gcode) return;
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.gcode';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyLabel =
    copyState === 'copied'
      ? t('gcode.copied')
      : copyState === 'error'
        ? t('gcode.copyFailed')
        : t('gcode.copy');

  if (!gcode) {
    return <EmptyState>{t('gcode.empty')}</EmptyState>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-ci-accent px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-ci-accent-hover focus-ring"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-md border border-ci-rule bg-ci-surface px-4 py-2 font-body text-sm font-medium text-ci-text transition-colors hover:bg-ci-accent-subtle focus-ring"
        >
          {t('gcode.download')}
        </button>
      </div>
      <div aria-live="polite" className="sr-only">
        {copyState === 'copied' && t('gcode.copyAria')}
        {copyState === 'error' && t('gcode.copyFailedAria')}
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg border border-ci-rule bg-[#131417] p-5 font-mono text-xs leading-relaxed text-[#DDE1E6]">
        {gcode}
      </pre>
    </div>
  );
}
