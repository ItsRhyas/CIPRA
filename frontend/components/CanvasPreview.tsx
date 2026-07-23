'use client';

import React, { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n/useT';
import { EmptyState } from '@/components/EmptyState';

export interface CanvasPreviewProps {
  imageUrl: string | null;
}

const MAX_WIDTH = 600;

export function CanvasPreview({ imageUrl }: CanvasPreviewProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageUrl) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const aspectRatio = image.naturalWidth / image.naturalHeight;
      const width = Math.min(image.naturalWidth, MAX_WIDTH);
      const height = width / aspectRatio;
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
    };
    image.src = imageUrl;

    return () => {
      image.onload = null;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return <EmptyState>{t('preview.empty')}</EmptyState>;
  }

  return (
    <div className="rounded-lg border border-ci-rule bg-ci-surface p-6">
      <canvas
        ref={canvasRef}
        className="block h-auto w-full rounded"
        aria-label={t('preview.ariaLabel')}
      />
    </div>
  );
}
