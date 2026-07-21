'use client';

import { useEffect, useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
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
  const { state, result, error, imageUrl, convert, reset } = useConvert();

  // Auto-switch to the G-Code viewer when a new conversion completes.
  useEffect(() => {
    if (state === 'success' && result?.gcode && result.gcode.trim().length > 0) {
      setActiveTab('viewer');
    }
  }, [state, result]);

  const isUploading = state === 'uploading';
  const canConvert = file !== null && !isUploading;

  const handleConvert = async () => {
    if (!file) return;
    await convert(file, params);
  };

  const handleReset = () => {
    setFile(null);
    setParams(DEFAULTS);
    reset();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-center text-4xl font-bold tracking-tight">CIPRA</h1>
      <p className="mt-2 text-center text-lg text-gray-600">
        Convertidor Inteligente de Píxeles a Rutas Automatizadas
      </p>

      <section className="mt-8 space-y-6">
        <ImageDropzone onSelect={setFile} disabled={isUploading} />

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

        <div role="tabpanel" className="min-h-[200px]">
          {activeTab === 'preview' && <CanvasPreview imageUrl={imageUrl} />}
          {activeTab === 'viewer' && <GCodeViewer gcode={result?.gcode ?? null} />}
          {activeTab === 'gcode' && <GCodeOutput gcode={result?.gcode ?? null} />}
        </div>

        <ParameterPanel
          params={params}
          onChange={(changes) =>
            setParams((prev) => ({ ...prev, ...changes }))
          }
          disabled={isUploading}
        />

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-700" role="alert">
            {error}
          </div>
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
      </section>
    </main>
  );
}
