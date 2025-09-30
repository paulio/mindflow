import { useCallback, useEffect, useState } from 'react';
import { UndoStack } from '../lib/undo-stack';
import { events } from '../lib/events';

// Singleton stack shared across all hook consumers (session scope)
const globalStack = new UndoStack(100);
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() { listeners.forEach(l => { try { l(); } catch { /* ignore */ } }); }

export interface UndoEntry {
  type: string;
  undo: () => void;
  redo: () => void;
  // Additional metadata could be added later (timestamps, grouping keys, etc.)
}

export function pushUndo(entry: UndoEntry) {
  globalStack.push(entry as any);
  notify();
}

export function resetUndoHistory() {
  globalStack.clear();
  notify();
}

function perform(kind: 'undo' | 'redo') {
  const ok = kind === 'undo' ? globalStack.undo() : globalStack.redo();
  if (ok) {
    events.emit(kind === 'undo' ? 'undo:applied' : 'redo:applied', { actionType: 'generic' });
    notify();
  }
}

export function useUndoRedo() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(x => x + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const undo = useCallback(() => perform('undo'), []);
  const redo = useCallback(() => perform('redo'), []);
  const push = useCallback((entry: UndoEntry) => pushUndo(entry), []);
  return { undo, redo, push, canUndo: globalStack.canUndo(), canRedo: globalStack.canRedo() };
}
