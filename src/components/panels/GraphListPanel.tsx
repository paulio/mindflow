import React from 'react';
import { useGraph } from '../../state/graph-store';

export const GraphListPanel: React.FC = () => {
  const { graphs, newGraph, selectGraph, removeGraph, graph } = useGraph();
  return (
    <div style={{ width: 220, borderRight: '1px solid #222', padding: 8, overflowY: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>Maps</h3>
      <button onClick={() => newGraph()}>New</button>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {graphs.map(g => (
          <li key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button style={{ flex: 1, textAlign: 'left', background: g.id === graph?.id ? '#333' : 'transparent', color: 'inherit', border: 'none', padding: '2px 4px', cursor: 'pointer' }} onClick={() => selectGraph(g.id)}>{g.name}</button>
            <button aria-label="Delete graph" onClick={() => { if (confirm('Delete graph?')) removeGraph(g.id); }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
