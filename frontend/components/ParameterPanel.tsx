'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { ImageType, IMAGE_TYPE_PRESETS, IMAGE_TYPE_LABELS } from '@/lib/presets';
import { Tooltip } from '@/components/Tooltip';

export interface ParameterPanelProps {
  params: ConvertParams & { variant: Variant };
  onChange: (params: Partial<ConvertParams & { variant: Variant }>) => void;
  disabled?: boolean;
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

interface PillButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function PillButton({ label, selected, onClick, disabled }: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1 font-body text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-ring ${
        selected
          ? 'bg-ci-accent text-white'
          : 'border border-ci-rule bg-ci-surface text-ci-text hover:border-ci-accent hover:text-ci-accent'
      }`}
    >
      {label}
    </button>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <span className="font-body text-2xs font-semibold uppercase tracking-wider text-ci-muted">
      {children}
    </span>
  );
}

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
      <div className="mb-1 flex items-center gap-2">
        <Tooltip text={tooltip}>
          <label
            htmlFor={id}
            className="cursor-help font-body text-sm font-medium tracking-precise text-ci-text"
          >
            {label}: <span className="tabular-nums">{format(value)}</span>
          </label>
        </Tooltip>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="ml-auto font-body text-2xs font-medium tracking-precise text-ci-muted transition-colors hover:text-ci-text disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
          aria-label={`Reset ${label.toLowerCase()} to default`}
        >
          Reset
        </button>
      </div>
      <div className="flex items-center gap-3">
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
          className="w-20 rounded-md border border-ci-rule bg-ci-surface px-1 py-0.5 text-center font-body text-sm tabular-nums text-ci-text focus-ring"
        />
      </div>
    </div>
  );
}

/**
 * Controls for the vision pipeline parameters.
 *
 * Adds image-type presets, work-area config, rotation/invert transforms,
 * and parameter sliders.
 */
export function ParameterPanel({
  params,
  onChange,
  disabled = false,
  imageType,
  onImageTypeChange,
}: ParameterPanelProps) {
  const presetChangeRef = useRef(false);
  const [workAreaOpen, setWorkAreaOpen] = useState(false);

  const workAreaPreset = useMemo(() => {
    const w = params.scara?.work_area_w_mm;
    const h = params.scara?.work_area_h_mm;
    const match = WORK_AREA_PRESET_NAMES.find((name) => {
      const dims = WORK_AREA_PRESETS[name];
      return dims.work_area_w_mm === w && dims.work_area_h_mm === h;
    });
    return match ?? 'Custom';
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
    <div className="space-y-5 rounded-lg border border-ci-rule bg-ci-surface p-4">
      <div className="space-y-2">
        <SectionLabel>Image type</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {IMAGE_TYPES.map((type) => (
            <PillButton
              key={type}
              label={IMAGE_TYPE_LABELS[type]}
              selected={imageType === type}
              onClick={() => handlePreset(type)}
              disabled={disabled}
            />
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
        tooltip="Scales the final drawing size. 1.0 keeps the original size."
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
        tooltip="Edge detection sensitivity. Lower values capture more detail."
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
        tooltip="Controls path detail. Higher values produce smoother but less detailed lines."
        disabled={disabled}
        onChange={(simplify_tolerance) => handleImageParamChange({ simplify_tolerance })}
        onReset={() => handleImageParamChange({ simplify_tolerance: DEFAULTS.simplify_tolerance })}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tooltip text='Image preprocessing mode. "balanced" uses automatic threshold detection.'>
            <label
              htmlFor="variant"
              className="cursor-help font-body text-sm font-medium tracking-precise text-ci-text"
            >
              Variant
            </label>
          </Tooltip>
          <button
            type="button"
            onClick={() => handleImageParamChange({ variant: DEFAULTS.variant })}
            disabled={disabled}
            className="ml-auto font-body text-2xs font-medium tracking-precise text-ci-muted transition-colors hover:text-ci-text disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
            aria-label="Reset variant to default"
          >
            Reset
          </button>
        </div>
        <select
          id="variant"
          value={params.variant}
          onChange={(e) => handleImageParamChange({ variant: e.target.value as Variant })}
          disabled={disabled}
          className="block w-full rounded-md border border-ci-rule bg-ci-bg px-3 py-2 font-body text-sm text-ci-text focus-ring"
        >
          {VARIANTS.map((v) => (
            <option key={v} value={v}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-lg border border-ci-rule bg-ci-bg p-3">
        <SectionLabel>Transform</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {ROTATIONS.map((deg) => (
            <PillButton
              key={deg}
              label={`${deg}°`}
              selected={params.rotation_deg === deg}
              onClick={() => onChange({ rotation_deg: deg })}
              disabled={disabled}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton
            label="Flip H"
            selected={params.flip_h ?? false}
            onClick={() => onChange({ flip_h: !(params.flip_h ?? false) })}
            disabled={disabled}
          />
          <PillButton
            label="Flip V"
            selected={params.flip_v ?? false}
            onClick={() => onChange({ flip_v: !(params.flip_v ?? false) })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="rounded-lg border border-ci-rule bg-ci-bg">
        <button
          type="button"
          onClick={() => setWorkAreaOpen(!workAreaOpen)}
          className="flex w-full items-center justify-between rounded-lg p-3 text-left font-body text-sm font-medium tracking-precise text-ci-text transition-colors hover:bg-ci-accent-subtle"
        >
          <SectionLabel>Work area</SectionLabel>
          <span className="font-body text-2xs font-medium tracking-precise text-ci-muted">
            {workAreaOpen ? 'Hide' : 'Show'}
          </span>
        </button>
        {workAreaOpen && (
          <div className="space-y-3 p-3 pt-0">
            <div>
              <label
                htmlFor="workAreaPreset"
                className="block font-body text-sm font-medium tracking-precise text-ci-text"
              >
                Preset
              </label>
              <select
                id="workAreaPreset"
                value={workAreaPreset}
                onChange={(e) => handleWorkAreaPreset(e.target.value)}
                disabled={disabled}
                className="mt-1 block w-full rounded-md border-ci-rule bg-ci-surface px-3 py-2 font-body text-sm text-ci-text focus-ring"
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
                  className="block font-body text-sm font-medium tracking-precise text-ci-text"
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
                  className="mt-1 block w-full rounded-md border border-ci-rule bg-ci-surface px-3 py-2 font-body text-sm tabular-nums text-ci-text focus-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="workAreaH"
                  className="block font-body text-sm font-medium tracking-precise text-ci-text"
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
                  className="mt-1 block w-full rounded-md border border-ci-rule bg-ci-surface px-3 py-2 font-body text-sm tabular-nums text-ci-text focus-ring"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="travelSpeed"
                  className="block font-body text-sm font-medium tracking-precise text-ci-text"
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
                  className="mt-1 block w-full rounded-md border border-ci-rule bg-ci-surface px-3 py-2 font-body text-sm tabular-nums text-ci-text focus-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="drawSpeed"
                  className="block font-body text-sm font-medium tracking-precise text-ci-text"
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
                  className="mt-1 block w-full rounded-md border border-ci-rule bg-ci-surface px-3 py-2 font-body text-sm tabular-nums text-ci-text focus-ring"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleReset}
        disabled={disabled}
        className="w-full rounded-md bg-ci-accent-subtle px-4 py-2 font-body text-sm font-semibold text-ci-accent transition-colors hover:bg-ci-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
      >
        Reset defaults
      </button>
    </div>
  );
}
