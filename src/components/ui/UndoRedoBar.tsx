import React from 'react';
import { useUndoRedo } from '../../hooks/useUndoRedo';

export const UndoRedoBar: React.FC = () => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 72, // offset to avoid overlap with React Flow default Controls (which sit near left: 10)
        display: 'flex',
        gap: 8,
        padding: '4px 6px',
        background: 'rgba(15,17,25,0.85)',
        backdropFilter: 'blur(4px)',
        border: '1px solid #222',
        borderRadius: 6,
        zIndex: 20
      }}
      aria-label="Undo / Redo toolbar"
    >
      <button disabled={!canUndo} onClick={undo}>Undo</button>
      <button disabled={!canRedo} onClick={redo}>Redo</button>
    </div>
  );
};
