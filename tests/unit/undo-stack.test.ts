import { describe, it, expect } from 'vitest';
import { UndoStack } from '../../src/lib/undo-stack';

describe('Undo/Redo stack depth enforcement', () => {
  it('caps history at 10', () => {
    const u = new UndoStack(10);
    let value = 0;
    for (let i = 0; i < 15; i++) {
      const before = value;
      const after = i + 1;
      u.push({
        type: 'inc',
        undo: () => { value = before; },
        redo: () => { value = after; }
      });
      value = after;
    }
    // Only last 10 retained
    expect(u.size()).toBe(10);
  });
});

