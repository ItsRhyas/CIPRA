'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { ImageType, IMAGE_TYPE_PRESETS, IMAGE_TYPE_KEYS } from '@/lib/presets';
import { useT } from '@/lib/i18n/useT';
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

const IMAGE_TYPE_LABEL_KEYS: Record<Exclude<ImageType, 'custom'>, string> = {
  photo: 'preset.photo',
  line_art: 'preset.lineArt',
  sketch: 'preset.sketch',
  text: 'preset.text',
};

const WORK_AREA_PRESETS: Record<
  string,
  { work_area_w_mm: number; work_area_h_mm: number; labelKey: string }
> = {
  a4portrait: {
    work_area_w_mm: 210,
    work_area_h_mm: 297,
    labelKey: 'preset.a4portrait',
  },
  a4landscape: {
    work_area_w_mm: 297,
    work_area_h_mm: 210,
    labelKey: 'preset.a4landscape',
  },
  a3: { work_area_w_mm: 297, work_area_h_mm: 420, labelKey: 'preset.a3' },
  letter: {
    work_area_w_mm: 216,
    work_area_h_mm: 279,
    labelKey: 'preset.letter',
  },
};
const WORK_AREA_PRESET_KEYS = Object.keys(WORK_AREA_PRESETS);
const CUSTOM_KEY = 'custom';

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
  const t = useT();

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
          aria-label={t('params.resetAria', { label: label.toLowerCase() })}
        >
          {t('button.reset')}
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
  const t = useT();
  const presetChangeRef = useRef(false);
  const [workAreaOpen, setWorkAreaOpen] = useState(false);

  const workAreaPreset = useMemo(() => {
    const w = params.scara?.work_area_w_mm;
    const h = params.scara?.work_area_h_mm;
    const match = WORK_AREA_PRESET_KEYS.find((key) => {
      const dims = WORK_AREA_PRESETS[key];
      return dims.work_area_w_mm === w && dims.work_area_h_mm === h;
    });
    return match ?? CUSTOM_KEY;
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
    if (preset !== CUSTOM_KEY) {
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
    if (raw !== '' && Number.isNaN(parsed as number)) return;
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
        <SectionLabel>{t('params.imageType')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {IMAGE_TYPE_KEYS.map((type) => (
            <PillButton
              key={type}
              label={t(IMAGE_TYPE_LABEL_KEYS[type])}
              selected={imageType === type}
              onClick={() => handlePreset(type)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      <NumericParamRow
        id="scale"
        label={t('params.scale')}
        value={params.scale}
        min={0.1}
        max={5.0}
        step={0.1}
        defaultValue={DEFAULTS.scale}
        parse={parseFloat}
        format={(v) => v.toFixed(1)}
        tooltip={t('params.scale.tooltip')}
        disabled={disabled}
        onChange={(scale) => handleImageParamChange({ scale })}
        onReset={() => handleImageParamChange({ scale: DEFAULTS.scale })}
      />

      <NumericParamRow
        id="threshold"
        label={t('params.threshold')}
        value={params.threshold}
        min={0}
        max={255}
        step={1}
        defaultValue={DEFAULTS.threshold}
        parse={(value) => parseInt(value, 10)}
        format={(v) => String(v)}
        tooltip={t('params.threshold.tooltip')}
        disabled={disabled}
        onChange={(threshold) => handleImageParamChange({ threshold })}
        onReset={() => handleImageParamChange({ threshold: DEFAULTS.threshold })}
      />

      <NumericParamRow
        id="tolerance"
        label={t('params.tolerance')}
        value={params.simplify_tolerance}
        min={0.1}
        max={10.0}
        step={0.1}
        defaultValue={DEFAULTS.simplify_tolerance}
        parse={parseFloat}
        format={(v) => v.toFixed(1)}
        tooltip={t('params.tolerance.tooltip')}
        disabled={disabled}
        onChange={(simplify_tolerance) => handleImageParamChange({ simplify_tolerance })}
        onReset={() => handleImageParamChange({ simplify_tolerance: DEFAULTS.simplify_tolerance })}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tooltip text={t('params.variant.tooltip')}>
            <label
              htmlFor="variant"
              className="cursor-help font-body text-sm font-medium tracking-precise text-ci-text"
            >
              {t('params.variant')}
            </label>
          </Tooltip>
          <button
            type="button"
            onClick={() => handleImageParamChange({ variant: DEFAULTS.variant })}
            disabled={disabled}
            className="ml-auto font-body text-2xs font-medium tracking-precise text-ci-muted transition-colors hover:text-ci-text disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
            aria-label={t('params.resetAria', { label: t('params.variant').toLowerCase() })}
          >
            {t('button.reset')}
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
              {t(`variant.${v}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-lg border border-ci-rule bg-ci-bg p-3">
        <SectionLabel>{t('params.transform')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {ROTATIONS.map((deg) => (
            <PillButton
              key={deg}
              label={t(`rotate.${deg}`)}
              selected={params.rotation_deg === deg}
              onClick={() => onChange({ rotation_deg: deg })}
              disabled={disabled}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton
            label={t('flip.h')}
            selected={params.flip_h ?? false}
            onClick={() => onChange({ flip_h: !(params.flip_h ?? false) })}
            disabled={disabled}
          />
          <PillButton
            label={t('flip.v')}
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
          <SectionLabel>{t('params.workArea')}</SectionLabel>
          <span className="font-body text-2xs font-medium tracking-precise text-ci-muted">
            {workAreaOpen ? t('params.workArea.hide') : t('params.workArea.show')}
          </span>
        </button>
        {workAreaOpen && (
          <div className="space-y-3 p-3 pt-0">
            <div>
              <label
                htmlFor="workAreaPreset"
                className="block font-body text-sm font-medium tracking-precise text-ci-text"
              >
                {t('params.workArea.preset')}
              </label>
              <select
                id="workAreaPreset"
                value={workAreaPreset}
                onChange={(e) => handleWorkAreaPreset(e.target.value)}
                disabled={disabled}
                className="mt-1 block w-full rounded-md border-ci-rule bg-ci-surface px-3 py-2 font-body text-sm text-ci-text focus-ring"
              >
                {WORK_AREA_PRESET_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(WORK_AREA_PRESETS[key].labelKey)}
                  </option>
                ))}
                <option value={CUSTOM_KEY}>{t('preset.customSize')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="workAreaW"
                  className="block font-body text-sm font-medium tracking-precise text-ci-text"
                >
                  {t('params.workArea.w')}
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
                  {t('params.workArea.h')}
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
                  {t('params.travelSpeed')}
                </label>
                <input
                  id="travelSpeed"
                  type="number"
                  placeholder={t('params.travelSpeed.placeholder')}
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
                  {t('params.drawSpeed')}
                </label>
                <input
                  id="drawSpeed"
                  type="number"
                  placeholder={t('params.drawSpeed.placeholder')}
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
        {t('params.resetDefaults')}
      </button>
    </div>
  );
}
