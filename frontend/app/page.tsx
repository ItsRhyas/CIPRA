'use client';

import { useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { useConvert } from '@/hooks/useConvert';
import { ImageDropzone } from '@/components/ImageDropzone';
import { CanvasPreview } from '@/components/CanvasPreview';
import { ParameterPanel } from '@/components/ParameterPanel';
import { GCodeOutput } from '@/components/GCodeOutput';
import { WarningsList } from '@/components/WarningsList';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [params, setParams] = useState<ConvertParams & { variant: Variant }>(
    DEFAULTS
  );
  const { state, result, error, imageUrl, convert, reset } = useConvert();

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
        <CanvasPreview imageUrl={imageUrl} />
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

        <GCodeOutput gcode={result?.gcode ?? null} />
        <WarningsList warnings={result?.warnings ?? []} />
      </section>
    </main>
  );
}
