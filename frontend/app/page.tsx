'use client';

import { useEffect, useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { ImageType } from '@/lib/presets';
import { useConvert } from '@/hooks/useConvert';
import { ImageDropzone } from '@/components/ImageDropzone';
import { CanvasPreview } from '@/components/CanvasPreview';
import { GCodeViewer } from '@/components/GCodeViewer';
import { ParameterPanel } from '@/components/ParameterPanel';
import { GCodeOutput } from '@/components/GCodeOutput';
import { WarningsList } from '@/components/WarningsList';

type TabId = 'preview' | 'viewer' | 'gcode';

const TAB_LABELS: Record<TabId, string> = {
  preview: 'Preview',
  viewer: 'Paths',
  gcode: 'G-Code',
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [params, setParams] = useState<ConvertParams & { variant: Variant }>(
    DEFAULTS
  );
  const [activeTab, setActiveTab] = useState<TabId>('preview');
  const [imageType, setImageType] = useState<ImageType>('custom');
  const [realtime, setRealtime] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { state, result, error, convert, reset } = useConvert();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (state === 'success' && result?.gcode && result.gcode.trim().length > 0) {
      setActiveTab('viewer');
    }
  }, [state, result]);

  useEffect(() => {
    if (!realtime || !file) return;
    const timer = setTimeout(() => {
      convert(file, params);
    }, 500);
    return () => clearTimeout(timer);
  }, [file, params, realtime, convert]);

  const isUploading = state === 'uploading';
  const canConvert = file !== null && !isUploading;

  const handleConvert = async () => {
    if (!file) return;
    await convert(file, params);
  };

  const handleReset = () => {
    setFile(null);
    setParams(DEFAULTS);
    setImageType('custom');
    setRealtime(false);
    reset();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header className="border-b border-ci-rule bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <h1 className="font-display text-3xl tracking-tight text-ci-text">
            CIPRA
          </h1>
          <p className="mt-1 font-body text-sm tracking-precise text-ci-muted">
            Pixel to path, precisely
          </p>
        </div>
      </header>

      {/* ── Body — scrollable content, padded for the sticky bottom bar ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-8">
        <section className="space-y-8">
          {/* Dropzone */}
          <ImageDropzone onSelect={setFile} disabled={isUploading} />

          {/* Canvas / viewer area */}
          {file && (
            <>
              {/* Tabs */}
              <div role="tablist" aria-label="Conversion views" className="flex border-b border-ci-rule">
                {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={`relative pb-2.5 pr-6 font-body text-sm font-medium tracking-precise transition-colors ${
                      activeTab === tabId
                        ? 'text-ci-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-ci-accent'
                        : 'text-ci-muted hover:text-ci-text'
                    }`}
                  >
                    {TAB_LABELS[tabId]}
                  </button>
                ))}
              </div>

              {/* Tab panel */}
              <div role="tabpanel">
                {activeTab === 'preview' && <CanvasPreview imageUrl={previewUrl} />}
                {activeTab === 'viewer' && (
                  <GCodeViewer
                    gcode={result?.gcode ?? null}
                    workAreaW={params.scara?.work_area_w_mm}
                    workAreaH={params.scara?.work_area_h_mm}
                  />
                )}
                {activeTab === 'gcode' && <GCodeOutput gcode={result?.gcode ?? null} />}
              </div>

              {/* Parameters */}
              <ParameterPanel
                params={params}
                onChange={(changes) =>
                  setParams((prev) => ({ ...prev, ...changes }))
                }
                disabled={isUploading}
                realtime={realtime}
                onRealtimeChange={setRealtime}
                imageType={imageType}
                onImageTypeChange={setImageType}
              />

              {/* Error */}
              {error && (
                <div
                  className="rounded-lg border border-ci-danger/20 bg-ci-danger-bg px-4 py-3 font-body text-sm text-ci-danger"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* Warnings */}
              <WarningsList warnings={result?.warnings ?? []} />
            </>
          )}
        </section>
      </main>

      {/* ── Sticky bottom bar — Convert always accessible ── */}
      <footer className="sticky bottom-0 z-20 border-t border-ci-rule bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-4">
            {isUploading && (
              <p className="font-body text-sm text-ci-accent" aria-live="polite">
                Generating&hellip;
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {realtime && (
              <span className="font-body text-2xs font-medium tracking-precise text-ci-muted uppercase">
                Live
              </span>
            )}

            <button
              type="button"
              onClick={handleReset}
              disabled={isUploading}
              className="rounded-md px-3 py-2 font-body text-sm font-medium text-ci-muted transition-colors hover:bg-ci-accent-subtle hover:text-ci-text disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleConvert}
              disabled={!canConvert}
              className="rounded-md bg-ci-accent px-5 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-ci-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              {isUploading ? 'Converting&hellip;' : 'Convert'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
