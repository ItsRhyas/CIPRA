'use client';

import React from 'react';

export interface WarningsListProps {
  warnings: string[];
}

export function WarningsList({ warnings }: WarningsListProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-ci-warning/20 bg-ci-warning-bg p-4">
      <h3 className="font-body text-xs font-semibold tracking-precise text-ci-warning">
        Warnings
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning, index) => (
          <li key={index} className="font-body text-xs text-ci-warning/90">
            {warning}
          </li>
        ))}
      </ul>
    </div>
  );
}
