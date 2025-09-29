import React, { useState } from 'react';
import { useGraph } from '../../state/graph-store';

export const GraphMetaPanel: React.FC = () => {
  const { graph, nodes, edges, renameGraph } = useGraph();
  const [name, setName] = useState(graph?.name ?? '');
  if (!graph) return null;
  return (
    <div style={{ width: 220, borderLeft: '1px solid #222', padding: 8 }}>
      <h3>Details</h3>
      <form onSubmit={e => { e.preventDefault(); renameGraph(name); }}>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={80} />
        <button type="submit">Rename</button>
      </form>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Nodes: {nodes.length} | Edges: {edges.length}</div>
    </div>
  );
};
