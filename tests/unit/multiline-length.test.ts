import { describe, it, expect } from 'vitest';

// Simple utility mirroring enforcement logic (slice to 255 including newlines)
function enforceLimit(input: string): string {
  return input.slice(0,255);
}

describe('Multi-line length enforcement (255 including newlines)', () => {
  it('keeps total length <=255 even with newlines', () => {
    const longLine = 'a'.repeat(300);
    expect(enforceLimit(longLine).length).toBe(255);
  });
  it('counts newlines toward total', () => {
    const base = 'a'.repeat(250);
    const withNewlines = base + '\nXYZ'; // length 254
    const result = enforceLimit(withNewlines + '1234'); // would exceed
    expect(result.length).toBe(255);
    expect(result.endsWith('3')).toBe(true); // truncated after reaching limit
  });
});
