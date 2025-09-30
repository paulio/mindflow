import { describe, it, expect } from 'vitest';
import { UndoStack } from '../../src/lib/undo-stack';

// Direct stack clear behaviour; integration wiring covered elsewhere.

describe('UndoStack clear()', () => {
  it('empties stack and resets pointer', () => {
    const s = new UndoStack(5);
    s.push({ type: 'x', undo: () => {}, redo: () => {} });
    s.push({ type: 'y', undo: () => {}, redo: () => {} });
    expect(s.size()).toBe(2);
    expect(s.canUndo()).toBe(true);
    (s as any).clear();
    expect(s.size()).toBe(0);
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });
});
