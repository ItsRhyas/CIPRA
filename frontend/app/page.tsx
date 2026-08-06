'use client';

import { useEffect, useState } from 'react';
import { ConvertParams, Variant } from '@/lib/types';
import { DEFAULTS } from '@/lib/scara-defaults';
import { useConvert } from '@/hooks/useConvert';
import { useGcodeWs } from '@/hooks/useGcodeWs';
import { ApiError } from '@/lib/api';
import { ImageDropzone } from '@/components/ImageDropzone';
import { CanvasPreview } from '@/components/CanvasPreview';
import { GCodeViewer } from '@/components/GCodeViewer';
import { ParameterPanel } from '@/components/ParameterPanel';
import { GCodeOutput } from '@/components/GCodeOutput';
import { WarningsList } from '@/components/WarningsList';
import { ConnectionBadge } from '@/components/ConnectionBadge';

type TabId = 'preview' | 'viewer' | 'gcode';

const TAB_LABELS: Record<TabId, string> = {
  preview: 'Vista previa',
  viewer: 'Visualizador',
  gcode: 'Código G',
};

type PublishFeedback = 'success' | 'queued' | 'error';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [params, setParams] = useState<ConvertParams & { variant: Variant }>(
    DEFAULTS
  );
  const [activeTab, setActiveTab] = useState<TabId>('preview');
  const [publishFeedback, setPublishFeedback] = useState<PublishFeedback | null>(
    null
  );
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const { state, result, error, imageUrl, convert, reset } = useConvert();
  const { status, clients, publish } = useGcodeWs();

  // Auto-switch to the G-Code viewer when a new conversion completes.
  useEffect(() => {
    if (
      state === 'success' &&
      result?.gcode &&
      result.gcode.trim().length > 0
    ) {
      setActiveTab('viewer');
    }
  }, [state, result]);

  const isUploading = state === 'uploading';
  const canConvert = file !== null && !isUploading;
  const canPublish =
    !publishing &&
    state === 'success' &&
    result?.gcode !== null &&
    result?.gcode !== undefined &&
    result.gcode.trim().length > 0;

  const handleConvert = async () => {
    if (!file) return;
    await convert(file, params);
  };

  const handleReset = () => {
    setFile(null);
    setParams(DEFAULTS);
    reset();
    setPublishFeedback(null);
    setPublishMessage(null);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishFeedback(null);
    setPublishMessage(null);
    try {
      const res = await publish();
      if (res.connected && res.published) {
        setPublishFeedback('success');
        setPublishMessage('Enviado a Bombolab — en vivo');
      } else {
        setPublishFeedback('queued');
        setPublishMessage(
          'En cola de envío: ningún dispositivo Bombolab conectado en este momento.'
        );
      }
    } catch (err) {
      setPublishFeedback('error');
      if (err instanceof ApiError) {
        const body = err.body as
          | { error?: string; detail?: string }
          | undefined;
        if (body?.error === 'E_NO_JOB') {
          setPublishMessage(
            'No hay una imagen convertida para enviar. Convierte una imagen primero.'
          );
        } else {
          setPublishMessage(body?.detail ?? body?.error ?? err.message);
        }
      } else {
        setPublishMessage(
          err instanceof Error ? err.message : 'No se pudo enviar el G-Code.'
        );
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">CIPRA</h1>
          <p className="mt-2 text-lg text-gray-600">
            Convertidor Inteligente de Píxeles a Rutas Automatizadas
          </p>
        </div>
        <ConnectionBadge status={status} clients={clients} />
      </div>

      <section className="mt-8 space-y-6">
        <ImageDropzone onSelect={setFile} disabled={isUploading} />

        <div
          role="tablist"
          aria-label="Vistas de conversión"
          className="flex border-b border-gray-200"
        >
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
          {activeTab === 'viewer' && (
            <GCodeViewer gcode={result?.gcode ?? null} />
          )}
          {activeTab === 'gcode' && (
            <GCodeOutput gcode={result?.gcode ?? null} />
          )}
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

        {publishFeedback === 'success' && (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
            role="status"
          >
            {publishMessage}
          </div>
        )}
        {publishFeedback === 'queued' && (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800"
            role="status"
          >
            {publishMessage}
          </div>
        )}
        {publishFeedback === 'error' && (
          <div
            className="rounded-lg bg-red-50 p-4 text-red-700"
            role="alert"
          >
            {publishMessage}
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
            onClick={handlePublish}
            disabled={!canPublish}
            className="flex-1 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar a Bombolab
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