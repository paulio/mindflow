import { describe, it, expect } from 'vitest';
import { computeInitialBorderColour, ROOT_FALLBACK } from '../../src/lib/node-border-palette';

describe('node border mapping', () => {
  it('wraps around palette length', () => {
    const palette = ['#111111', '#222222', '#333333'];
    const m0 = computeInitialBorderColour(0, palette);
    const m1 = computeInitialBorderColour(1, palette);
    const m2 = computeInitialBorderColour(2, palette);
    const m3 = computeInitialBorderColour(3, palette);
    expect(m0).toEqual({ colour: '#111111', index: 0 });
    expect(m1).toEqual({ colour: '#222222', index: 1 });
    expect(m2).toEqual({ colour: '#333333', index: 2 });
    expect(m3).toEqual({ colour: '#111111', index: 0 });
  });

  it('falls back when palette empty', () => {
    const m = computeInitialBorderColour(5, []);
    expect(m.colour).toBe(ROOT_FALLBACK);
    expect(m.index).toBe(-1);
  });

  it('is deterministic for same depth/palette', () => {
    const palette = ['#aaaaaa', '#bbbbbb'];
    const a = computeInitialBorderColour(7, palette);
    const b = computeInitialBorderColour(7, palette);
    expect(a).toEqual(b);
  });
});
