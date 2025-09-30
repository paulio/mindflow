import React from 'react';
import { useGraph } from '../../state/graph-store';

export const Toolbar: React.FC = () => {
  const { activeTool, toggleTool } = useGraph();
  return (
    <div style={{ position: 'absolute', top: 48, left: 8, display: 'flex', flexDirection: 'column', gap: 8, background:'#12141c', padding:8, border:'1px solid #222', borderRadius:8, boxShadow:'0 4px 10px rgba(0,0,0,0.45)', zIndex: 50 }} aria-label="Node creation toolbar">
      <ToolButton tool="note" active={activeTool === 'note'} onClick={() => toggleTool('note')} label="Insert note" />
      <ToolButton tool="rect" active={activeTool === 'rect'} onClick={() => toggleTool('rect')} label="Insert rectangle" />
    </div>
  );
};

const ToolButton: React.FC<{ tool: 'note' | 'rect'; active: boolean; onClick(): void; label: string }> = ({ tool, active, onClick, label }) => {
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
        fontSize: 11,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background .15s var(--ease-standard), border .15s var(--ease-standard)',
        position: 'relative'
      }}
    >
      {tool === 'note' ? (
        // Post-it style note: slightly skewed square with a subtle curl and lines
        <svg width="24" height="24" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="noteGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5e27a" />
              <stop offset="100%" stopColor="#e2c94f" />
            </linearGradient>
          </defs>
          <path d="M6.5 5.2 15.8 4c.9-.1 1.7.5 1.9 1.4l1.8 8.9c.2.9-.4 1.8-1.3 2L9.1 18.5c-.9.2-1.8-.4-2-1.3L4.9 7.6c-.2-.9.4-1.8 1.3-2Z" fill="url(#noteGrad)" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9.5h5.5M9.6 12.2h4.2" stroke="#5a5122" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M16.9 6.8 18 12.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
        </svg>
      ) : (
        // Filled rectangle icon
        <svg width="24" height="24" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
          <rect x="5" y="6" width="14" height="12" rx="2" fill="var(--mf-handle-source, #4d79ff)" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {active && (
        <span style={{ position:'absolute', bottom:-6, width:6, height:6, borderRadius:'50%', background:'var(--mf-node-border-selected)' }} />
      )}
    </button>
  );
};
