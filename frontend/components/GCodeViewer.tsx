'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { parseGCode, ParsedGCode } from '@/lib/gcode-parser';

export interface GCodeViewerProps {
  gcode: string | null;
  workAreaW?: number;
  workAreaH?: number;
}

const CONTAINER_WIDTH = 560;
const CONTAINER_HEIGHT = 792;
const PADDING_PX = 16;
const DEFAULT_WORK_AREA_W_MM = 210;
const DEFAULT_WORK_AREA_H_MM = 297;

/**
 * Render parsed G-Code on a native canvas.
 *
 * Draws the A4 work-area frame, rapid travels (G0) as light gray dashed
 * lines and draw strokes (G1) as solid black lines. The Y axis is flipped
 * so G-Code coordinates (origin bottom-left) map correctly to canvas
 * coordinates (origin top-left).
 */
export function GCodeViewer({
  gcode,
  workAreaW = DEFAULT_WORK_AREA_W_MM,
  workAreaH = DEFAULT_WORK_AREA_H_MM,
}: GCodeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parsed = useMemo<ParsedGCode | null>(
    () => (gcode ? parseGCode(gcode) : null),
    [gcode]
  );

  let effectiveW = workAreaW;
  let effectiveH = workAreaH;
  if (!Number.isFinite(effectiveW) || effectiveW <= 0) {
    console.warn(
      `GCodeViewer: invalid workAreaW (${workAreaW}), falling back to A4 (${DEFAULT_WORK_AREA_W_MM}).`
    );
    effectiveW = DEFAULT_WORK_AREA_W_MM;
  }
  if (!Number.isFinite(effectiveH) || effectiveH <= 0) {
    console.warn(
      `GCodeViewer: invalid workAreaH (${workAreaH}), falling back to A4 (${DEFAULT_WORK_AREA_H_MM}).`
    );
    effectiveH = DEFAULT_WORK_AREA_H_MM;
  }

  const canvasScale = Math.min(
    CONTAINER_WIDTH / effectiveW,
    CONTAINER_HEIGHT / effectiveH
  );
  const canvasWidth = effectiveW * canvasScale;
  const canvasHeight = effectiveH * canvasScale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Work-area frame.
    const frameX = PADDING_PX;
    const frameY = PADDING_PX;
    const frameW = canvasWidth - PADDING_PX * 2;
    const frameH = canvasHeight - PADDING_PX * 2;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    if (!gcode || !parsed) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Convierte una imagen para ver la visualización',
        canvasWidth / 2,
        canvasHeight / 2
      );
      return;
    }

    const scale = Math.min(frameW / effectiveW, frameH / effectiveH);

    const toCanvasX = (mmX: number): number =>
      frameX + mmX * scale;
    const toCanvasY = (mmY: number): number =>
      frameY + frameH - mmY * scale;

    // Travels (G0) — light gray dashed.
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const travel of parsed.travels) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(travel.from.x), toCanvasY(travel.from.y));
      ctx.lineTo(toCanvasX(travel.to.x), toCanvasY(travel.to.y));
      ctx.stroke();
    }

    // Strokes (G1) — solid black.
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    for (const stroke of parsed.strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(stroke.points[0].x), toCanvasY(stroke.points[0].y));
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(toCanvasX(stroke.points[i].x), toCanvasY(stroke.points[i].y));
      }
      ctx.stroke();
    }
    // Canvas rendering is synchronous — no cleanup needed.
    // If RAF or timers are added later, cancel them here.
    return () => {};
  }, [gcode, parsed, effectiveW, effectiveH, canvasWidth, canvasHeight]);

  return (
    <div className="space-y-2">
      {parsed && parsed.warnings.length > 0 && (
        <div
          className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
          role="status"
        >
          Algunas líneas de G-Code no fueron reconocidas y fueron omitidas.
        </div>
      )}
      <div className="rounded-lg border border-gray-200 p-4">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block max-w-full rounded"
          aria-label="G-Code visualization"
        />
      </div>
    </div>
  );
}
