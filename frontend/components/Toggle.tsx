'use client';

import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      {label && (
        <span className="font-body text-xs font-medium tracking-precise text-ci-text">
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring ${
          enabled ? 'bg-ci-accent' : 'bg-ci-rule-strong'
        }`}
        style={{ '--toggle-offset': enabled ? '18px' : '3px' } as React.CSSProperties}
      >
        <span className="inline-block h-3.5 w-3.5 translate-x-[var(--toggle-offset)] transform rounded-full bg-white shadow-sm transition-transform" />
      </button>
    </label>
  );
}
