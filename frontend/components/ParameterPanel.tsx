'use client';

import React from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';

export interface ParameterPanelProps {
  params: ConvertParams & { variant: Variant };
  onChange: (params: Partial<ConvertParams & { variant: Variant }>) => void;
  disabled?: boolean;
}

const VARIANTS: Variant[] = ['fast', 'detailed', 'balanced'];

/**
 * Controls for the vision pipeline parameters.
 *
 * - scale: 0.1–5.0
 * - threshold: 0–255
 * - simplify_tolerance: 0.1–10.0
 * - variant: fast | detailed | balanced
 */
export function ParameterPanel({
  params,
  onChange,
  disabled = false,
}: ParameterPanelProps) {
  const handleReset = () => {
    onChange({ ...DEFAULTS });
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div>
        <label
          htmlFor="scale"
          className="block text-sm font-medium text-gray-700"
          title="Multiplica el tamaño final del dibujo. 1.0 = tamaño original."
        >
          Scale: {params.scale.toFixed(1)}
        </label>
        <input
          id="scale"
          type="range"
          min={0.1}
          max={5.0}
          step={0.1}
          value={params.scale}
          onChange={(e) => onChange({ scale: parseFloat(e.target.value) })}
          disabled={disabled}
          className="w-full"
        />
      </div>

      <div>
        <label
          htmlFor="threshold"
          className="block text-sm font-medium text-gray-700"
          title="Sensibilidad de detección de bordes. Valores más bajos detectan más detalles."
        >
          Threshold: {params.threshold}
        </label>
        <input
          id="threshold"
          type="range"
          min={0}
          max={255}
          step={1}
          value={params.threshold}
          onChange={(e) => onChange({ threshold: parseInt(e.target.value, 10) })}
          disabled={disabled}
          className="w-full"
        />
      </div>

      <div>
        <label
          htmlFor="tolerance"
          className="block text-sm font-medium text-gray-700"
          title="Controla el nivel de detalle de las trayectorias. Valores más altos producen líneas más suaves pero menos detalladas."
        >
          Simplify tolerance: {params.simplify_tolerance.toFixed(1)}
        </label>
        <input
          id="tolerance"
          type="range"
          min={0.1}
          max={10.0}
          step={0.1}
          value={params.simplify_tolerance}
          onChange={(e) =>
            onChange({ simplify_tolerance: parseFloat(e.target.value) })
          }
          disabled={disabled}
          className="w-full"
        />
      </div>

      <div>
        <label
          htmlFor="variant"
          className="block text-sm font-medium text-gray-700"
          title={'Modo de preprocesado de la imagen. "balanced" usa detección automática de umbral.'}
        >
          Variant
        </label>
        <select
          id="variant"
          value={params.variant}
          onChange={(e) => onChange({ variant: e.target.value as Variant })}
          disabled={disabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {VARIANTS.map((v) => (
            <option key={v} value={v}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleReset}
        disabled={disabled}
        className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reset defaults
      </button>
    </div>
  );
}
