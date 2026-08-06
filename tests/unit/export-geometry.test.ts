import { describe, expect, it } from 'vitest';
import { getBezierBounds, getBezierCurve, getHandleAnchor, type ExportRect } from '../../src/lib/export-geometry';

const rect: ExportRect = { x: 10, y: 20, width: 40, height: 30 };

describe('export geometry', () => {
  it('uses directional handle anchors with a center fallback', () => {
    expect(getHandleAnchor(rect, 'n')).toEqual({ x: 30, y: 20, direction: 'n' });
    expect(getHandleAnchor(rect, 'e')).toEqual({ x: 50, y: 35, direction: 'e' });
    expect(getHandleAnchor(rect, 's')).toEqual({ x: 30, y: 50, direction: 's' });
    expect(getHandleAnchor(rect, 'w')).toEqual({ x: 10, y: 35, direction: 'w' });
    expect(getHandleAnchor(rect, 'invalid')).toEqual({ x: 30, y: 35, direction: null });
  });

  it('matches editor control offsets for short directional links', () => {
    const start = { x: 10, y: 15, direction: 'e' as const };
    const end = { x: 30, y: 15, direction: 'w' as const };
    expect(getBezierCurve(start, end)).toEqual({
      start,
      control1: { x: 20, y: 15 },
      control2: { x: 20, y: 15 },
      end,
    });
  });

  it('matches editor offsets for reversed horizontal and vertical handle directions', () => {
    const reversedHorizontal = getBezierCurve(
      { x: 30, y: 15, direction: 'e' },
      { x: 10, y: 15, direction: 'w' },
    );
    expect(reversedHorizontal.control1.x).toBeCloseTo(57.95084971874737);
    expect(reversedHorizontal.control2.x).toBeCloseTo(-17.95084971874737);

    const northToSouth = getBezierCurve(
      { x: 10, y: 30, direction: 'n' },
      { x: 10, y: 10, direction: 's' },
    );
    expect(northToSouth.control1.y).toBe(20);
    expect(northToSouth.control2.y).toBe(20);

    const reversedVertical = getBezierCurve(
      { x: 10, y: 10, direction: 'n' },
      { x: 10, y: 30, direction: 's' },
    );
    expect(reversedVertical.control1.y).toBeCloseTo(-17.95084971874737);
    expect(reversedVertical.control2.y).toBeCloseTo(57.95084971874737);

    const southToNorth = getBezierCurve(
      { x: 10, y: 10, direction: 's' },
      { x: 10, y: 30, direction: 'n' },
    );
    expect(southToNorth.control1.y).toBe(20);
    expect(southToNorth.control2.y).toBe(20);
  });

  it('uses linear control interpolation for legacy center anchors', () => {
    const start = { x: 0, y: 0, direction: null };
    const end = { x: 100, y: 80, direction: 's' as const };
    expect(getBezierCurve(start, end)).toEqual({ start, control1: { x: 25, y: 20 }, control2: { x: 75, y: 60 }, end });
  });

  it('includes interior cubic extrema in both axes', () => {
    const horizontal = getBezierBounds({
      start: { x: 0, y: 15, direction: null }, control1: { x: 100, y: 15 }, control2: { x: 100, y: 15 }, end: { x: 0, y: 15, direction: null },
    });
    const vertical = getBezierBounds({
      start: { x: 10, y: 0, direction: null }, control1: { x: 10, y: 100 }, control2: { x: 10, y: 100 }, end: { x: 10, y: 0, direction: null },
    });
    expect(horizontal).toEqual({ minX: 0, minY: 15, maxX: 75, maxY: 15 });
    expect(vertical).toEqual({ minX: 10, minY: 0, maxX: 10, maxY: 75 });
  });

  it('returns finite bounds for degenerate and near-limit finite curves', () => {
    const degenerate = getBezierBounds({
      start: { x: 0, y: 0, direction: null }, control1: { x: 1, y: 0 }, control2: { x: 2, y: 0 }, end: { x: 3, y: 0, direction: null },
    });
    const nearLimit = getBezierBounds({
      start: { x: -1e308, y: 0, direction: null }, control1: { x: 1e308, y: 0 }, control2: { x: 1e308, y: 0 }, end: { x: -1e308, y: 0, direction: null },
    });
    expect(degenerate).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 0 });
    expect(nearLimit.maxX).toBeCloseTo(5e307, -292);
    expect(Object.values(nearLimit).every(Number.isFinite)).toBe(true);
  });
});
