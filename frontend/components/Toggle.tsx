'use client';

import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ enabled, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      {label && (
        <span className="font-body text-xs font-medium tracking-precise text-ci-text">
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? 'bg-ci-accent' : 'bg-ci-rule-strong'
        }`}
        style={{ '--toggle-offset': enabled ? '18px' : '3px' } as React.CSSProperties}
      >
        <span className="inline-block h-3.5 w-3.5 translate-x-[var(--toggle-offset)] transform rounded-full bg-white shadow-sm transition-transform" />
      </button>
    </label>
  );
}
