import React from 'react';
import { useUndoRedo } from '../../hooks/useUndoRedo';

export const UndoRedoBar: React.FC = () => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  return (
    <div style={{ position: 'fixed', bottom: 8, left: 8, display: 'flex', gap: 8 }}>
      <button disabled={!canUndo} onClick={undo}>Undo</button>
      <button disabled={!canRedo} onClick={redo}>Redo</button>
    </div>
  );
};
