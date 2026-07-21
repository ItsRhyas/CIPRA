'use client';

import React from 'react';

export interface WarningsListProps {
  warnings: string[];
}

/**
 * Render backend warnings with amber/yellow styling.
 *
 * Returns null when there are no warnings to keep the layout clean.
 */
export function WarningsList({ warnings }: WarningsListProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-800">Warnings</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning, index) => (
          <li key={index} className="text-sm text-amber-700">
            {warning}
          </li>
        ))}
      </ul>
    </div>
  );
}
