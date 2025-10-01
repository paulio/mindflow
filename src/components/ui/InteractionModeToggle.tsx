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
        // Marquee / selection rectangle icon (empty dashed box)
        <svg width="22" height="22" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
          <rect x="5" y="5" width="14" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />
        </svg>
      ) : (
        // Standard grab / grabbing hand icon pair.
        // Inactive (open hand = 'grab'), Active (closed hand = 'grabbing').
        <svg width="22" height="22" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
          {active ? (
            // Closed hand (grabbing)
            <path
              d="M6.9 10.5V7.2a1.2 1.2 0 0 1 2.4 0v3.8h.9V6.5a1.2 1.2 0 0 1 2.4 0v4.5h.9V7.4a1.2 1.2 0 0 1 2.4 0v5.2h.9V9.8a1.2 1.2 0 0 1 2.4 0v4.9c0 3.2-2.4 5.8-5.6 5.8h-3.2c-3.5 0-6.3-2.8-6.3-6.3v-3.7c0-.66.54-1.2 1.2-1.2.66 0 1.2.54 1.2 1.2Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          ) : (
            // Open hand (ready to grab)
            <path
              d="M6 5.2a1.2 1.2 0 0 1 2.4 0v5h1V4.9a1.2 1.2 0 0 1 2.4 0v5.3h1V6.2a1.2 1.2 0 0 1 2.4 0v4.9h1V8.4a1.2 1.2 0 0 1 2.4 0v6.1c0 3.3-2.5 5.9-5.8 5.9h-3c-3.7 0-6.4-3-6.4-6.7V9.2c0-.66.54-1.2 1.2-1.2.66 0 1.2.54 1.2 1.2v1h.2V5.2Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          )}
        </svg>
      )}
      {active && (
        <span style={{ position:'absolute', bottom:-6, width:6, height:6, borderRadius:'50%', background:'var(--mf-node-border-selected)' }} />
      )}
    </button>
  );
};
