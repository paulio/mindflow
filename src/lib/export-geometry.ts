export type HandleDirection = 'n' | 'e' | 's' | 'w';

export interface ExportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandleAnchor {
  x: number;
  y: number;
  direction: HandleDirection | null;
}

interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  start: HandleAnchor;
  control1: Point;
  control2: Point;
  end: HandleAnchor;
}

export interface BezierBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EDGE_CURVATURE = 0.25;
const EXTREMA_RELATIVE_TOLERANCE = Number.EPSILON * 8;

export function getHandleAnchor(rect: ExportRect, handle?: string): HandleAnchor {
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  switch (handle) {
    case 'n': return { x: center.x, y: rect.y, direction: 'n' };
    case 'e': return { x: rect.x + rect.width, y: center.y, direction: 'e' };
    case 's': return { x: center.x, y: rect.y + rect.height, direction: 's' };
    case 'w': return { x: rect.x, y: center.y, direction: 'w' };
    default: return { ...center, direction: null };
  }
}

export function getBezierCurve(start: HandleAnchor, end: HandleAnchor): BezierCurve {
  if (start.direction === null || end.direction === null) {
    return { start, control1: interpolate(start, end, 0.25), control2: interpolate(start, end, 0.75), end };
  }
  return {
    start,
    control1: offset(start, controlOffset(start, end)),
    control2: offset(end, controlOffset(end, start)),
    end,
  };
}

export function getBezierBounds(curve: BezierCurve): BezierBounds {
  const xValues = extremaValues(curve.start.x, curve.control1.x, curve.control2.x, curve.end.x);
  const yValues = extremaValues(curve.start.y, curve.control1.y, curve.control2.y, curve.end.y);
  return { minX: Math.min(...xValues), minY: Math.min(...yValues), maxX: Math.max(...xValues), maxY: Math.max(...yValues) };
}

function interpolate(start: Point, end: Point, amount: number): Point {
  return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount };
}

function controlOffset(anchor: HandleAnchor, other: HandleAnchor): number {
  switch (anchor.direction) {
    case 'n': return -calculateControlOffset(anchor.y - other.y);
    case 'e': return calculateControlOffset(other.x - anchor.x);
    case 's': return calculateControlOffset(other.y - anchor.y);
    case 'w': return -calculateControlOffset(anchor.x - other.x);
    default: return 0;
  }
}

function calculateControlOffset(distance: number): number {
  return distance >= 0
    ? 0.5 * distance
    : EDGE_CURVATURE * 25 * Math.sqrt(-distance);
}

function offset(anchor: HandleAnchor, distance: number): Point {
  switch (anchor.direction) {
    case 'n': return { x: anchor.x, y: anchor.y + distance };
    case 'e': return { x: anchor.x + distance, y: anchor.y };
    case 's': return { x: anchor.x, y: anchor.y + distance };
    case 'w': return { x: anchor.x + distance, y: anchor.y };
    default: return { x: 0, y: 0 };
  }
}

function extremaValues(start: number, control1: number, control2: number, end: number): number[] {
  const coordinates = [start, control1, control2, end];
  const scale = Math.max(...coordinates.map(Math.abs));
  if (!Number.isFinite(scale)) return coordinates.filter(Number.isFinite);
  if (scale === 0) return [0];
  const [p0, p1, p2, p3] = coordinates.map(value => value / scale);
  const values = [start, end].filter(Number.isFinite);
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (-2 * p1 + p2 + p0);
  const c = p1 - p0;
  const coefficientScale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  if (!Number.isFinite(coefficientScale) || coefficientScale === 0) return values;
  const normalizedA = a / coefficientScale;
  const normalizedB = b / coefficientScale;
  const normalizedC = c / coefficientScale;
  if (Math.abs(normalizedA) <= EXTREMA_RELATIVE_TOLERANCE) {
    if (Math.abs(normalizedB) > EXTREMA_RELATIVE_TOLERANCE) addRoot(values, -normalizedC / normalizedB, scale, p0, p1, p2, p3);
  } else {
    const discriminant = normalizedB ** 2 - 4 * normalizedA * normalizedC;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const q = -0.5 * (normalizedB + Math.sign(normalizedB || 1) * root);
      if (q === 0) addRoot(values, -normalizedB / (2 * normalizedA), scale, p0, p1, p2, p3);
      else {
        addRoot(values, q / normalizedA, scale, p0, p1, p2, p3);
        addRoot(values, normalizedC / q, scale, p0, p1, p2, p3);
      }
    }
  }
  return values;
}

function addRoot(values: number[], amount: number, scale: number, p0: number, p1: number, p2: number, p3: number): void {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1) return;
  const value = ((1 - amount) ** 3 * p0 + 3 * (1 - amount) ** 2 * amount * p1 + 3 * (1 - amount) * amount ** 2 * p2 + amount ** 3 * p3) * scale;
  if (Number.isFinite(value)) values.push(value);
}
