import React from 'react';
import { useGraph } from '../../state/graph-store';

export const InteractionModeToggle: React.FC = () => {
  const { interactionMode, setInteractionMode } = useGraph();
  return (
    <div style={{ position:'absolute', top: 48, left: 72, display:'flex', flexDirection:'column', gap:8, background:'#12141c', padding:8, border:'1px solid #222', borderRadius:8, boxShadow:'0 4px 10px rgba(0,0,0,0.45)', zIndex:50 }} aria-label="Interaction mode toolbar">
      <ModeButton mode="select" active={interactionMode==='select'} onClick={() => setInteractionMode('select')} label="Selection Mode" />
      <ModeButton mode="grab" active={interactionMode==='grab'} onClick={() => setInteractionMode('grab')} label="Grab / Pan Mode" />
    </div>
  );
};

const ModeButton: React.FC<{ mode: 'grab' | 'select'; active: boolean; onClick(): void; label: string }> = ({ mode, active, onClick, label }) => {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      style={{
        background: active ? 'var(--mf-node-bg-selected)' : '#1a1d25',
        color: 'var(--mf-node-text)',
        border: active ? '1px solid var(--mf-node-border-selected)' : '1px solid #2d313b',
        padding: 6,
        width: 44,
        height: 44,
        cursor: 'pointer',
        fontSize: 10,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background .15s var(--ease-standard), border .15s var(--ease-standard)',
        position: 'relative'
      }}
    >
      {mode === 'select' ? (
        <svg width="22" height="22" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
          <path d="M5 4 18 12 11 13 13 19 10 20 8 13 5 15Z" fill="currentColor" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
          <path d="M6 9c0-1.7 1.3-3 3-3 .8 0 1.6.3 2.1.9L12 8l.9-1.1c.5-.6 1.3-.9 2.1-.9 1.7 0 3 1.3 3 3 0 .7-.2 1.3-.6 1.8l-5.4 6.5-5.4-6.5C6.2 10.3 6 9.7 6 9Z" fill="currentColor" />
        </svg>
      )}
      {active && (
        <span style={{ position:'absolute', bottom:-6, width:6, height:6, borderRadius:'50%', background:'var(--mf-node-border-selected)' }} />
      )}
    </button>
  );
};
