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
 * Draws the work-area frame, rapid travels (G0) as dashed light-gray lines and
 * draw strokes (G1) as solid dark lines. The Y axis is flipped so G-Code
 * coordinates (origin bottom-left) map correctly to canvas coordinates
 * (origin top-left).
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

  const { effectiveW, effectiveH, canvasWidth, canvasHeight } = useMemo(() => {
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
    return {
      effectiveW,
      effectiveH,
      canvasWidth: effectiveW * canvasScale,
      canvasHeight: effectiveH * canvasScale,
    };
  }, [workAreaW, workAreaH]);

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

    // Draw subtle grid inside the work area using the shared CSS grid cell.
    const gridSpacingPx = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'),
      10
    ) || 24;

    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    ctx.strokeStyle = 'rgb(30 58 95 / 0.04)';
    ctx.lineWidth = 1;
    for (let x = frameX; x <= frameX + frameW; x += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(x, frameY);
      ctx.lineTo(x, frameY + frameH);
      ctx.stroke();
    }
    for (let y = frameY; y <= frameY + frameH; y += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(frameX, y);
      ctx.lineTo(frameX + frameW, y);
      ctx.stroke();
    }
    ctx.restore();

    // Work-area border.
    ctx.strokeStyle = '#DDE1E6';
    ctx.lineWidth = 1;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    if (!gcode || !parsed) {
      ctx.fillStyle = '#556270';
      ctx.font = '13px var(--font-body, Inter, system-ui, sans-serif)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Convert an image to see the toolpath',
        canvasWidth / 2,
        canvasHeight / 2
      );
      return;
    }

    const scale = Math.min(frameW / effectiveW, frameH / effectiveH);

    const toCanvasX = (mmX: number): number => frameX + mmX * scale;
    const toCanvasY = (mmY: number): number =>
      frameY + frameH - mmY * scale;

    // Travels (G0) — dashed light gray.
    ctx.strokeStyle = '#DDE1E6';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const travel of parsed.travels) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(travel.from.x), toCanvasY(travel.from.y));
      ctx.lineTo(toCanvasX(travel.to.x), toCanvasY(travel.to.y));
      ctx.stroke();
    }

    // Strokes (G1) — solid dark.
    ctx.strokeStyle = '#131417';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    for (const stroke of parsed.strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(stroke.points[0].x), toCanvasY(stroke.points[0].y));
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(
          toCanvasX(stroke.points[i].x),
          toCanvasY(stroke.points[i].y)
        );
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
          className="rounded-md border border-ci-warning/20 bg-ci-warning-bg px-3 py-2 font-body text-xs text-ci-warning"
          role="status"
        >
          Some G-Code lines were not recognized and have been omitted.
        </div>
      )}
      <div className="rounded-lg border border-ci-rule bg-ci-surface p-6">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block max-w-full rounded"
          aria-label="G-Code toolpath visualization"
        />
      </div>
    </div>
  );
}
