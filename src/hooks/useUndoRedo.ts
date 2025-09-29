import { useCallback, useRef, useState } from 'react';
import { UndoStack } from '../lib/undo-stack';
import { events } from '../lib/events';

export function useUndoRedo() {
  const stackRef = useRef(new UndoStack(10));
  const [, force] = useState(0);
  const undo = useCallback(() => {
    if (stackRef.current.undo()) {
      events.emit('undo:applied', { actionType: 'generic' });
      force(x => x + 1);
    }
  }, []);
  const redo = useCallback(() => {
    if (stackRef.current.redo()) {
      events.emit('redo:applied', { actionType: 'generic' });
      force(x => x + 1);
    }
  }, []);
  const push = useCallback((entry: any) => {
    stackRef.current.push(entry);
    force(x => x + 1);
  }, []);
  return { undo, redo, push, canUndo: stackRef.current.canUndo(), canRedo: stackRef.current.canRedo() };
}
