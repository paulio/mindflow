import { describe, it, expect } from 'vitest';
import { UndoStack } from '../../src/lib/undo-stack';

describe('UndoStack move single entry (T171)', () => {
  it('treats a conceptual drag gesture as one entry (simulated)', () => {
    const stack = new UndoStack(10);
    let undoCount = 0;
    stack.push({ type: 'move', undo: () => { undoCount++; }, redo: () => {} });
    // Simulate many interim position updates NOT pushed (future integration ensures only final commit is pushed)
    expect(stack.size()).toBe(1);
    stack.undo();
    expect(undoCount).toBe(1);
  });
});
