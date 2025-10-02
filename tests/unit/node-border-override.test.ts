import { describe, it, expect } from 'vitest';
import { applyBorderOverride, clearBorderOverride } from '../../src/lib/node-border-override';

describe('node border override helpers', () => {
  it('applies override and sets fields', () => {
    const base = { originalBorderColour: '#123456', currentBorderColour: '#123456', borderPaletteIndex: 0, borderOverrideFlag: false };
    const next = applyBorderOverride(base, '#abcdef');
    expect(next.borderOverrideFlag).toBe(true);
    expect(next.borderOverrideColour).toBe('#abcdef');
    expect(next.currentBorderColour).toBe('#abcdef');
  });

  it('clears override restoring original colour', () => {
    const overridden = {
      originalBorderColour: '#123456',
      currentBorderColour: '#abcdef',
      borderPaletteIndex: 0,
      borderOverrideFlag: true,
      borderOverrideColour: '#abcdef'
    };
    const cleared = clearBorderOverride(overridden);
    expect(cleared.borderOverrideFlag).toBe(false);
    expect(cleared.borderOverrideColour).toBeUndefined();
    expect(cleared.currentBorderColour).toBe('#123456');
  });

  it('clear is idempotent when no override', () => {
    const base = { originalBorderColour: '#123456', currentBorderColour: '#123456', borderOverrideFlag: false };
    const cleared = clearBorderOverride(base);
    expect(cleared).toBe(base); // identical object (early return)
  });

  it('accepts 8-digit hex (palette with alpha)', () => {
    const base = { originalBorderColour: '#123456ff', currentBorderColour: '#123456ff', borderPaletteIndex: 0, borderOverrideFlag: false } as any;
    const next = applyBorderOverride(base, '#0e4ee6ff');
    expect(next.borderOverrideFlag).toBe(true);
    expect(next.currentBorderColour).toBe('#0e4ee6ff');
    const cleared = clearBorderOverride(next);
    expect(cleared.borderOverrideFlag).toBe(false);
    expect(cleared.currentBorderColour).toBe('#123456ff');
  });
});
