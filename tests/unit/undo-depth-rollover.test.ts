import { describe, it, expect } from 'vitest';
import { UndoStack } from '../../src/lib/undo-stack';

describe('UndoStack depth rollover (T170)', () => {
  it('drops oldest when exceeding max depth 100', () => {
    const stack = new UndoStack(100);
    let undoCalls = 0;
    // push 105 entries
    for (let i = 0; i < 105; i++) {
      const id = i;
      stack.push({
        type: 'test',
        undo: () => { undoCalls++; },
        redo: () => { /* noop */ }
      });
    }
    expect(stack.size()).toBe(100); // capacity enforced
    // Oldest 5 should be gone; undoing all should call undo 100 times
    while (stack.canUndo()) {
      stack.undo();
    }
    expect(undoCalls).toBe(100);
  });
});
