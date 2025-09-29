import { describe, it, expect } from 'vitest';
import { generateId } from '../../src/lib/indexeddb';

describe('Graph ID & uniqueness utilities', () => {
  it('generates unique ids', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateId());
    }
    expect(set.size).toBe(100);
  });
});

