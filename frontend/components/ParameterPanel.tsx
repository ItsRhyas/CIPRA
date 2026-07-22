'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { ImageType, IMAGE_TYPE_PRESETS, IMAGE_TYPE_LABELS } from '@/lib/presets';
import { Tooltip } from '@/components/Tooltip';
import { Toggle } from '@/components/Toggle';

export interface ParameterPanelProps {
  params: ConvertParams & { variant: Variant };
  onChange: (params: Partial<ConvertParams & { variant: Variant }>) => void;
  disabled?: boolean;
  realtime: boolean;
  onRealtimeChange: (v: boolean) => void;
  imageType: ImageType;
  onImageTypeChange: (t: ImageType) => void;
}

const VARIANTS: Variant[] = ['fast', 'detailed', 'balanced'];
const ROTATIONS = [0, 90, 180, 270] as const;
const IMAGE_TYPES: Exclude<ImageType, 'custom'>[] = [
  'photo',
  'line_art',
  'sketch',
  'text',
];

const WORK_AREA_PRESETS: Record<string, { work_area_w_mm: number; work_area_h_mm: number }> = {
  'A4 Portrait': { work_area_w_mm: 210, work_area_h_mm: 297 },
  'A4 Landscape': { work_area_w_mm: 297, work_area_h_mm: 210 },
  'A3': { work_area_w_mm: 297, work_area_h_mm: 420 },
  'Letter': { work_area_w_mm: 216, work_area_h_mm: 279 },
};
const WORK_AREA_PRESET_NAMES = Object.keys(WORK_AREA_PRESETS);

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
 * Adds image-type presets, work-area config, rotation/invert transforms,
 * and a real-time toggle on top of the existing parameter sliders.
 */
export function ParameterPanel({
  params,
  onChange,
  disabled = false,
  realtime,
  onRealtimeChange,
  imageType,
  onImageTypeChange,
}: ParameterPanelProps) {
  const presetChangeRef = useRef(false);
  const [workAreaOpen, setWorkAreaOpen] = useState(false);
  const [workAreaPreset, setWorkAreaPreset] = useState('Custom');

  useEffect(() => {
    const w = params.scara?.work_area_w_mm;
    const h = params.scara?.work_area_h_mm;
    const match = WORK_AREA_PRESET_NAMES.find((name) => {
      const dims = WORK_AREA_PRESETS[name];
      return dims.work_area_w_mm === w && dims.work_area_h_mm === h;
    });
    setWorkAreaPreset(match ?? 'Custom');
  }, [params.scara?.work_area_w_mm, params.scara?.work_area_h_mm]);

  const handleImageParamChange = (
    changes: Partial<ConvertParams & { variant: Variant }>
  ) => {
    if (presetChangeRef.current) {
      presetChangeRef.current = false;
    } else {
      onImageTypeChange('custom');
    }
    onChange(changes);
  };

  const handlePreset = (type: ImageType) => {
    onImageTypeChange(type);
    if (type !== 'custom') {
      presetChangeRef.current = true;
      handleImageParamChange(IMAGE_TYPE_PRESETS[type]);
    }
  };

  const handleReset = () => {
    onImageTypeChange('custom');
    onChange({ ...DEFAULTS });
  };

  const handleWorkAreaPreset = (preset: string) => {
    setWorkAreaPreset(preset);
    if (preset !== 'Custom') {
      const dims = WORK_AREA_PRESETS[preset];
      onChange({
        scara: {
          ...params.scara,
          work_area_w_mm: dims.work_area_w_mm,
          work_area_h_mm: dims.work_area_h_mm,
        },
      });
    }
  };

  const handleWorkAreaDimension = (
    field: 'work_area_w_mm' | 'work_area_h_mm',
    raw: string
  ) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    setWorkAreaPreset('Custom');
    onChange({
      scara: {
        ...params.scara,
        [field]: parsed,
      },
    });
  };

  const handleSpeed = (
    field: 'travel_speed' | 'draw_speed',
    raw: string
  ) => {
    const parsed = raw === '' ? undefined : parseFloat(raw);
    if (raw !== '' && Number.isNaN(parsed)) return;
    onChange({
      scara: {
        ...params.scara,
        [field]: parsed,
      },
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            Image type
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {IMAGE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handlePreset(type)}
              disabled={disabled}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                imageType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {IMAGE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

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
        onChange={(scale) => handleImageParamChange({ scale })}
        onReset={() => handleImageParamChange({ scale: DEFAULTS.scale })}
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
        onChange={(threshold) => handleImageParamChange({ threshold })}
        onReset={() => handleImageParamChange({ threshold: DEFAULTS.threshold })}
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
        onChange={(simplify_tolerance) => handleImageParamChange({ simplify_tolerance })}
        onReset={() => handleImageParamChange({ simplify_tolerance: DEFAULTS.simplify_tolerance })}
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
            onClick={() => handleImageParamChange({ variant: DEFAULTS.variant })}
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
          onChange={(e) => handleImageParamChange({ variant: e.target.value as Variant })}
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

      <div className="space-y-3 rounded-lg border border-gray-200 p-3">
        <h3 className="text-sm font-medium text-gray-700">Transform</h3>
        <div className="flex flex-wrap gap-2">
          {ROTATIONS.map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onChange({ rotation_deg: deg })}
              disabled={disabled}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                params.rotation_deg === deg
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ flip_h: !(params.flip_h ?? false) })}
            disabled={disabled}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              params.flip_h
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ↔ Flip H
          </button>
          <button
            type="button"
            onClick={() => onChange({ flip_v: !(params.flip_v ?? false) })}
            disabled={disabled}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              params.flip_v
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ↕ Flip V
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setWorkAreaOpen(!workAreaOpen)}
          className="flex w-full items-center justify-between rounded-lg p-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Work area
          <span aria-hidden="true">{workAreaOpen ? '▲' : '▼'}</span>
        </button>
        {workAreaOpen && (
          <div className="space-y-3 p-3 pt-0">
            <div>
              <label
                htmlFor="workAreaPreset"
                className="block text-sm font-medium text-gray-700"
              >
                Preset
              </label>
              <select
                id="workAreaPreset"
                value={workAreaPreset}
                onChange={(e) => handleWorkAreaPreset(e.target.value)}
                disabled={disabled}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {[...WORK_AREA_PRESET_NAMES, 'Custom'].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="workAreaW"
                  className="block text-sm font-medium text-gray-700"
                >
                  W (mm)
                </label>
                <input
                  id="workAreaW"
                  type="number"
                  value={params.scara?.work_area_w_mm ?? ''}
                  onChange={(e) =>
                    handleWorkAreaDimension('work_area_w_mm', e.target.value)
                  }
                  disabled={disabled}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="workAreaH"
                  className="block text-sm font-medium text-gray-700"
                >
                  H (mm)
                </label>
                <input
                  id="workAreaH"
                  type="number"
                  value={params.scara?.work_area_h_mm ?? ''}
                  onChange={(e) =>
                    handleWorkAreaDimension('work_area_h_mm', e.target.value)
                  }
                  disabled={disabled}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="travelSpeed"
                  className="block text-sm font-medium text-gray-700"
                >
                  Travel speed (mm/min)
                </label>
                <input
                  id="travelSpeed"
                  type="number"
                  placeholder="Default"
                  value={params.scara?.travel_speed ?? ''}
                  onChange={(e) => handleSpeed('travel_speed', e.target.value)}
                  disabled={disabled}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="drawSpeed"
                  className="block text-sm font-medium text-gray-700"
                >
                  Draw speed (mm/min)
                </label>
                <input
                  id="drawSpeed"
                  type="number"
                  placeholder="Default"
                  value={params.scara?.draw_speed ?? ''}
                  onChange={(e) => handleSpeed('draw_speed', e.target.value)}
                  disabled={disabled}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Toggle
        enabled={realtime}
        onChange={onRealtimeChange}
        label="Real-time generation"
      />

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
