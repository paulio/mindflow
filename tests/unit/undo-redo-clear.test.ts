import { describe, it, expect } from 'vitest';
import { UndoStack } from '../../src/lib/undo-stack';

describe('UndoStack redo clearing (T173)', () => {
  it('clears redo entries after pushing new entry post-undo', () => {
    const stack = new UndoStack(10);
    const record: string[] = [];
    function make(id: string) {
      return { type: 'x', undo: () => record.push('u'+id), redo: () => record.push('r'+id) };
    }
    stack.push(make('A'));
    stack.push(make('B'));
    expect(stack.canUndo()).toBe(true);
    stack.undo(); // undo B
    expect(stack.canRedo()).toBe(true);
    stack.push(make('C')); // should clear redo (B)
    expect(stack.canRedo()).toBe(false);
  });
});
