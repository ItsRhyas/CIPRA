'use client';

import React, { useEffect, useRef } from 'react';

export interface CanvasPreviewProps {
  imageUrl: string | null;
}

const MAX_WIDTH = 600;

/**
 * Render the uploaded image on a canvas at its natural aspect ratio.
 *
 * The canvas is never wider than 600 px; height is computed from the aspect ratio.
 * When imageUrl is null the canvas is cleared and an empty state is shown.
 */
export function CanvasPreview({ imageUrl }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageUrl) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const aspectRatio = image.naturalWidth / image.naturalHeight;
      const width = Math.min(image.naturalWidth, MAX_WIDTH);
      const height = width / aspectRatio;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
    };
    image.src = imageUrl;

    return () => {
      image.onload = null;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
        Upload an image to preview
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <canvas
        ref={canvasRef}
        className="block max-w-full rounded"
        aria-label="Image preview"
      />
    </div>
  );
}
