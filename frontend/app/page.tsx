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
  preview: 'Vista previa',
  viewer: 'Visualizador',
  gcode: 'Código G',
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

  // Create/revoke an object URL for the selected image so the preview canvas
  // can render it immediately after file selection.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Auto-switch to the G-Code viewer when a new conversion completes.
  useEffect(() => {
    if (state === 'success' && result?.gcode && result.gcode.trim().length > 0) {
      setActiveTab('viewer');
    }
  }, [state, result]);

  // Debounced real-time conversion: when the toggle is ON and a file is
  // selected, wait 500ms after the last param/file change before converting.
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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-center text-4xl font-bold tracking-tight">CIPRA</h1>
      <p className="mt-2 text-center text-lg text-gray-600">
        Convertidor Inteligente de Píxeles a Rutas Automatizadas
      </p>

      <section className="mt-8 space-y-6">
        <ImageDropzone onSelect={setFile} disabled={isUploading} />

        <div className="grid md:grid-cols-[2fr_1fr] gap-6 md:items-start">
          <div>
            <div role="tablist" aria-label="Vistas de conversión" className="flex border-b border-gray-200">
              {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tabId
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {TAB_LABELS[tabId]}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="min-h-[400px]">
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
          </div>

          <div className="space-y-4 md:sticky md:top-4">
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

            {error && (
              <div className="min-h-[2rem] rounded-lg bg-red-50 p-4 text-red-700" role="alert">
                {error}
              </div>
            )}

            {isUploading && (
              <p className="text-sm text-blue-600" aria-live="polite">
                Generating...
              </p>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleConvert}
                disabled={!canConvert}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? 'Converting...' : 'Convert'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading}
                className="rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            <WarningsList warnings={result?.warnings ?? []} />
          </div>
        </div>
      </section>
    </main>
  );
}
