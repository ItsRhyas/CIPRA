'use client';

import React from 'react';

export interface GCodeOutputProps {
  gcode: string | null;
}

/**
 * Display generated G-Code with copy-to-clipboard and .gcode download actions.
 *
 * Shows an instructional empty state when no G-Code is available yet.
 */
export function GCodeOutput({ gcode }: GCodeOutputProps) {
  const handleCopy = async () => {
    if (!gcode) return;
    try {
      await navigator.clipboard.writeText(gcode);
    } catch {
      // Clipboard access may be denied; fail silently.
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

  if (!gcode) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-500">
        Convert an image to generate G-Code
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Download .gcode
        </button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 font-mono text-sm text-gray-100">
        {gcode}
      </pre>
    </div>
  );
}
