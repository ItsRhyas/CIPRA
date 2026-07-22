'use client';

import React from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { Tooltip } from '@/components/Tooltip';

export interface ParameterPanelProps {
  params: ConvertParams & { variant: Variant };
  onChange: (params: Partial<ConvertParams & { variant: Variant }>) => void;
  disabled?: boolean;
}

const VARIANTS: Variant[] = ['fast', 'detailed', 'balanced'];

interface NumericParamRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  parse: (value: string) => number;
  format: (value: number) => string;
  tooltip: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}

function NumericParamRow({
  id,
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  parse,
  format,
  tooltip,
  disabled,
  onChange,
  onReset,
}: NumericParamRowProps) {
  const handleChange = (raw: string) => {
    const parsed = parse(raw);
    onChange(Number.isNaN(parsed) ? min : parsed);
  };

  const handleBlur = (raw: string) => {
    const parsed = parse(raw);
    onChange(
      Number.isNaN(parsed)
        ? defaultValue
        : Math.min(max, Math.max(min, parsed))
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Tooltip text={tooltip}>
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 cursor-help"
          >
            {label}: {format(value)}
          </label>
        </Tooltip>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset to default"
          aria-label={`Reset ${label.toLowerCase()} to default`}
        >
          ↺
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={(e) => handleBlur(e.target.value)}
          disabled={disabled}
          className="w-20 px-1 py-0.5 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

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
      <NumericParamRow
        id="scale"
        label="Scale"
        value={params.scale}
        min={0.1}
        max={5.0}
        step={0.1}
        defaultValue={DEFAULTS.scale}
        parse={parseFloat}
        format={(v) => v.toFixed(1)}
        tooltip="Multiplica el tamaño final del dibujo. 1.0 = tamaño original."
        disabled={disabled}
        onChange={(scale) => onChange({ scale })}
        onReset={() => onChange({ scale: DEFAULTS.scale })}
      />

      <NumericParamRow
        id="threshold"
        label="Threshold"
        value={params.threshold}
        min={0}
        max={255}
        step={1}
        defaultValue={DEFAULTS.threshold}
        parse={(value) => parseInt(value, 10)}
        format={(v) => String(v)}
        tooltip="Sensibilidad de detección de bordes. Valores más bajos detectan más detalles."
        disabled={disabled}
        onChange={(threshold) => onChange({ threshold })}
        onReset={() => onChange({ threshold: DEFAULTS.threshold })}
      />

      <NumericParamRow
        id="tolerance"
        label="Simplify tolerance"
        value={params.simplify_tolerance}
        min={0.1}
        max={10.0}
        step={0.1}
        defaultValue={DEFAULTS.simplify_tolerance}
        parse={parseFloat}
        format={(v) => v.toFixed(1)}
        tooltip="Controla el nivel de detalle de las trayectorias. Valores más altos producen líneas más suaves pero menos detalladas."
        disabled={disabled}
        onChange={(simplify_tolerance) => onChange({ simplify_tolerance })}
        onReset={() => onChange({ simplify_tolerance: DEFAULTS.simplify_tolerance })}
      />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Tooltip text='Modo de preprocesado de la imagen. "balanced" usa detección automática de umbral.'>
            <label
              htmlFor="variant"
              className="text-sm font-medium text-gray-700 cursor-help"
            >
              Variant
            </label>
          </Tooltip>
          <button
            type="button"
            onClick={() => onChange({ variant: DEFAULTS.variant })}
            disabled={disabled}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Reset to default"
            aria-label="Reset variant to default"
          >
            ↺
          </button>
        </div>
        <select
          id="variant"
          value={params.variant}
          onChange={(e) => onChange({ variant: e.target.value as Variant })}
          disabled={disabled}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
