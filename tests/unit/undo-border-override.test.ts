import { describe, it, expect } from 'vitest';
import { applyBorderOverride, clearBorderOverride } from '../../src/lib/node-border-override';

interface UndoEntry { undo: () => void; redo: () => void; }

describe('undo for border override operations', () => {
  it('single undo reverts override application', () => {
    let node = { originalBorderColour: '#111111', currentBorderColour: '#111111', borderOverrideFlag: false };
    const undoStack: UndoEntry[] = [];

    // Simulate override action with undo registration
    const prev = { ...node };
    node = applyBorderOverride(node, '#222222');
    undoStack.push({
      undo: () => { node = prev; },
      redo: () => { node = applyBorderOverride(prev, '#222222'); }
    });

    expect(node.currentBorderColour).toBe('#222222');
    expect(node.borderOverrideFlag).toBe(true);

    // Undo
    const entry = undoStack.pop();
    entry?.undo();
    expect(node.currentBorderColour).toBe('#111111');
    expect(node.borderOverrideFlag).toBe(false);
  });

  it('single undo reverts clear override', () => {
    let node = { originalBorderColour: '#111111', currentBorderColour: '#222222', borderOverrideFlag: true, borderOverrideColour: '#222222' };
    const undoStack: UndoEntry[] = [];
    const prev = { ...node };
    node = clearBorderOverride(node);
    undoStack.push({
      undo: () => { node = prev; },
      redo: () => { node = clearBorderOverride(prev); }
    });
    expect(node.currentBorderColour).toBe('#111111');
    expect(node.borderOverrideFlag).toBe(false);
    // Undo
    const entry = undoStack.pop();
    entry?.undo();
    expect(node.currentBorderColour).toBe('#222222');
    expect(node.borderOverrideFlag).toBe(true);
  });
});
