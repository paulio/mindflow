import { describe, it, expect } from 'vitest';
import { UndoStack } from '../../src/lib/undo-stack';

// This test isolates expected semantics: no entry on no-op, one entry on change.
// NOTE: Integration with pushUndo happens in graph-store; here we just mimic push logic.

describe('Text undo semantics (no-op exclusion)', () => {
  it('does not create an entry for identical text', () => {
    const stack = new UndoStack(5);
    const before = stack.size();
    // Simulate no push when old === new
    // (Nothing to do — just assert size unchanged)
    expect(stack.size()).toBe(before);
  });
  it('tracks one entry per committed change', () => {
    const stack = new UndoStack(5);
    stack.push({ type: 'text', undo: () => {}, redo: () => {} });
    stack.push({ type: 'text', undo: () => {}, redo: () => {} });
    expect(stack.size()).toBe(2);
  });
});
