import { describe, it, expect } from 'vitest';
import { resolveNodeBackground } from '../../src/lib/background-precedence';

describe('background precedence', () => {
  it('explicit bgColor wins even when override active (override only affects border)', () => {
    const rec = { borderOverrideFlag: true, currentBorderColour: '#abcdef', originalBorderColour: '#123456', bgColor: '#ff0000' };
    expect(resolveNodeBackground(rec)).toBe('#ff0000');
  });
  it('explicit bgColor wins when no override', () => {
    const rec = { borderOverrideFlag: false, currentBorderColour: '#123456', originalBorderColour: '#654321', bgColor: '#ff00ff' };
    expect(resolveNodeBackground(rec)).toBe('#ff00ff');
  });
  it('override active but no explicit bg uses original depth colour (not override)', () => {
    const rec = { borderOverrideFlag: true, currentBorderColour: '#abcdef', originalBorderColour: '#123456' };
    expect(resolveNodeBackground(rec)).toBe('#123456');
  });
  it('falls back through chain', () => {
    const rec1 = { borderOverrideFlag: false, currentBorderColour: '#111111' };
    const rec2 = { borderOverrideFlag: false, originalBorderColour: '#222222' };
    const rec3 = { borderOverrideFlag: false } as any;
    expect(resolveNodeBackground(rec1)).toBe('#111111');
    expect(resolveNodeBackground(rec2)).toBe('#222222');
    expect(resolveNodeBackground(rec3, '#fallback')).toBe('#fallback');
  });
});
