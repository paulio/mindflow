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
      <IconButton
        disabled={!canUndo}
        onClick={undo}
        ariaLabel="Undo"
        title="Undo (Ctrl+Z)"
          icon={(<svg width="22" height="22" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
            <path d="M9 7 5 11l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 11h7.5a3.5 3.5 0 0 1 0 7H10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>)}
      />
      <IconButton
        disabled={!canRedo}
        onClick={redo}
        ariaLabel="Redo"
        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          icon={(<svg width="22" height="22" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
            <path d="M15 7 19 11l-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 11h-7.5a3.5 3.5 0 0 0 0 7H14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>)}
      />
    </div>
  );
};

interface IconButtonProps {
  onClick(): void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  icon: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ onClick, disabled, ariaLabel, title, icon }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    title={title}
    style={{
      width: 40,
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: disabled ? '#1e222b' : '#1a1d25',
      color: disabled ? '#555' : '#e0e6f0',
      border: '1px solid #2d313b',
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: 0,
      transition: 'background .15s, color .15s, border .15s'
    }}
    onKeyDown={(e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onClick();
      }
    }}
  >
    {icon}
  </button>
);
