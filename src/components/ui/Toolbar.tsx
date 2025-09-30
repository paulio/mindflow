import React from 'react';
import { useGraph } from '../../state/graph-store';

export const Toolbar: React.FC = () => {
  const { activeTool, toggleTool } = useGraph();
  return (
    <div style={{ position: 'absolute', top: 48, left: 8, display: 'flex', flexDirection: 'column', gap: 6, background:'#12141c', padding:8, border:'1px solid #222', borderRadius:6, boxShadow:'0 2px 4px rgba(0,0,0,0.4)', zIndex: 50 }} aria-label="Node creation toolbar">
      <ToolButton tool="note" active={activeTool === 'note'} onClick={() => toggleTool('note')} label="note tool" />
      <ToolButton tool="rect" active={activeTool === 'rect'} onClick={() => toggleTool('rect')} label="rectangle tool" />
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
        background: active ? 'var(--mf-node-bg-selected)' : 'var(--mf-node-bg)',
        color: 'var(--mf-node-text)',
        border: active ? '1px solid var(--mf-node-border-selected)' : '1px solid var(--mf-node-border)',
        padding: '4px 6px',
        minWidth: 48,
        cursor: 'pointer',
        fontSize: 12,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {tool === 'note' ? 'Note' : 'Rect'}
    </button>
  );
};
