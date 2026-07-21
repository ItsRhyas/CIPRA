/**
 * Pure G-Code parser for the CIPRA dialect.
 *
 * Supports the minimal command set emitted by the backend formatter:
 *   G21 (units mm), G90 (absolute coordinates),
 *   G0  (rapid travel), G1 (draw stroke),
 *   M3  (pen down), M5 (pen up).
 *
 * Unknown or malformed lines are collected as warnings so rendering can
 * continue with whatever was parseable.
 */

export interface Point {
  x: number; // mm
  y: number; // mm
}

export interface Stroke {
  points: Point[]; // Sequence of G1 points between a M3..M5 block
}

export interface Travel {
  from: Point;
  to: Point;
}

export interface ParsedGCode {
  strokes: Stroke[];
  travels: Travel[];
  warnings: string[];
}

interface ParseState {
  current: Point;
  penDown: boolean;
  activeStroke: Point[];
  strokes: Stroke[];
  travels: Travel[];
  warnings: string[];
}

const COMMAND_PATTERN = /^(G0|G1|G21|G90|M3|M5)\b/i;
const COORDINATE_PATTERN = /[XY]-?\d+(\.\d+)?/gi;

function parseCoordinates(line: string): Point | null {
  const matches = line.match(COORDINATE_PATTERN);
  if (!matches) return null;

  let x: number | undefined;
  let y: number | undefined;

  for (const token of matches) {
    const value = parseFloat(token.slice(1));
    if (Number.isNaN(value)) continue;
    if (token[0].toUpperCase() === 'X') x = value;
    if (token[0].toUpperCase() === 'Y') y = value;
  }

  if (x === undefined || y === undefined) return null;
  return { x, y };
}

function finalizeStroke(state: ParseState): void {
  if (state.activeStroke.length > 0) {
    state.strokes.push({ points: state.activeStroke });
    state.activeStroke = [];
  }
}

/**
 * Parse a raw G-Code string into strokes, travels and warnings.
 *
 * The parser is tolerant: it never throws and returns warnings for lines
 * that cannot be interpreted.
 */
export function parseGCode(raw: string): ParsedGCode {
  const state: ParseState = {
    current: { x: 0, y: 0 },
    penDown: false,
    activeStroke: [],
    strokes: [],
    travels: [],
    warnings: [],
  };

  const lines = raw.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === '' || line.startsWith(';') || line.startsWith('(')) {
      continue;
    }

    const commandMatch = line.match(COMMAND_PATTERN);
    if (!commandMatch) {
      state.warnings.push(`Line ${index + 1}: unrecognized command "${line}"`);
      continue;
    }

    const command = commandMatch[1].toUpperCase();

    switch (command) {
      case 'G21':
      case 'G90':
        // Configuration commands: recognized but do not affect geometry.
        break;

      case 'G0': {
        const target = parseCoordinates(line);
        if (!target) {
          state.warnings.push(
            `Line ${index + 1}: G0 missing valid X/Y coordinates`
          );
          break;
        }
        state.travels.push({ from: state.current, to: target });
        state.current = target;
        break;
      }

      case 'G1': {
        const target = parseCoordinates(line);
        if (!target) {
          state.warnings.push(
            `Line ${index + 1}: G1 missing valid X/Y coordinates`
          );
          break;
        }
        if (state.penDown) {
          // Start a new stroke if this is the first G1 after M3.
          if (state.activeStroke.length === 0) {
            state.activeStroke.push(state.current);
          }
          state.activeStroke.push(target);
        }
        state.current = target;
        break;
      }

      case 'M3':
        state.penDown = true;
        if (state.activeStroke.length === 0) {
          // The current position becomes the first point of the stroke.
          state.activeStroke.push(state.current);
        }
        break;

      case 'M5':
        state.penDown = false;
        finalizeStroke(state);
        break;

      default:
        state.warnings.push(`Line ${index + 1}: unrecognized command "${line}"`);
    }
  }

  finalizeStroke(state);

  return {
    strokes: state.strokes,
    travels: state.travels,
    warnings: state.warnings,
  };
}
