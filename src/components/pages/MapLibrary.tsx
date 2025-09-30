import React from 'react';
import { useGraph } from '../../state/graph-store';
import { GraphListPanel } from '../panels/GraphListPanel';

export const MapLibrary: React.FC = () => {
  const { newGraph, graphs, selectGraph } = useGraph();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '4px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong style={{ flex: 1 }}>Mindflow Library</strong>
        <button onClick={() => newGraph()}>New Map</button>
      </header>
      <div style={{ flex: 1, display: 'flex', padding: 12, gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>Saved Maps</h3>
          {graphs.length === 0 && <div style={{ opacity: 0.6 }}>No maps yet. Create one to begin.</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {graphs.map(g => (
              <li key={g.id}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    fontSize: 13,
                    lineHeight: 1.3,
                    transition: 'background var(--dur-med) var(--ease-standard), border var(--dur-med) var(--ease-standard)'
                  }}
                  onClick={() => selectGraph(g.id)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#25262c'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
                  onFocus={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 2px var(--color-focus-ring)'; }}
                  onBlur={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ fontWeight: 600, letterSpacing: .3 }}>{g.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.78, fontFamily: 'monospace' }}>Last opened {new Date(g.lastOpened).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ maxWidth: 420, fontSize: 13, lineHeight: 1.5 }}>
          <h4 style={{ margin: '4px 0 8px' }}>How it works</h4>
          <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Create a new map or open an existing one.</li>
            <li>In the canvas view, double‑click a node to edit; drag handles to create linked nodes.</li>
            <li>Return here with the Back button in the canvas header.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};