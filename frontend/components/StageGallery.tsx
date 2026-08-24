'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StageImage } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import { EmptyState } from '@/components/EmptyState';

export interface StageGalleryProps {
  stage_images: StageImage[];
}

const MAX_WIDTH = 600;

function dataUrlFromBase64(pngBase64: string): string {
  return `data:image/png;base64,${pngBase64}`;
}

export function StageGallery({ stage_images }: StageGalleryProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const stages = [...stage_images].sort((a, b) => a.order - b.order);

  useEffect(() => {
    setCurrentIndex(0);
  }, [stage_images.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stage = stages[currentIndex];
    if (!stage) {
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
    image.src = dataUrlFromBase64(stage.png_base64);

    return () => {
      image.onload = null;
    };
  }, [stages, currentIndex]);

  if (stages.length === 0) {
    return <EmptyState>{t('stages.empty')}</EmptyState>;
  }

  const currentStage = stages[currentIndex];
  const displayLabel = t(`stages.label.${currentStage.id}`, undefined) || currentStage.label;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === stages.length - 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : stages.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < stages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="rounded-lg border border-ci-rule bg-ci-surface p-6">
      <figure className="space-y-4">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full rounded"
          aria-label={displayLabel}
        />
        <figcaption className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="font-body text-sm font-medium text-ci-text">
              {displayLabel}
            </p>
            <p className="font-body text-2xs tracking-precise text-ci-muted">
              {t('stages.stepOf', { current: currentIndex + 1, total: stages.length })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isFirst}
              className="rounded-md border border-ci-rule bg-white px-3 py-2 font-body text-sm font-medium text-ci-text transition-colors hover:bg-ci-accent-subtle disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              {t('stages.prev')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isLast}
              className="rounded-md border border-ci-rule bg-white px-3 py-2 font-body text-sm font-medium text-ci-text transition-colors hover:bg-ci-accent-subtle disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              {t('stages.next')}
            </button>
          </div>
        </figcaption>
      </figure>
    </div>
  );
}
