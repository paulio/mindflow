import React, { useState } from 'react';
import { useGraph } from '../../state/graph-store';
import { useTheme } from '../../state/theme-store';

export const GraphMetaPanel: React.FC = () => {
  const { graph, nodes, edges, renameGraph, selectedNodeId, selectNode, levels } = useGraph();
  const { theme, setTheme, available } = useTheme();
  const [name, setName] = useState(graph?.name ?? '');
  if (!graph) return null;
  return (
    <div style={{ width: 260, borderLeft: '1px solid #222', padding: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3>Details</h3>
      <form onSubmit={e => { e.preventDefault(); renameGraph(name); }}>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={80} />
        <button type="submit">Rename</button>
      </form>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Nodes: {nodes.length} | Edges: {edges.length}</div>
      {selectedNodeId && (
        <div style={{ fontSize: 12, marginTop: 6 }}>
          {(() => {
            const lvl = levels.get(selectedNodeId) ?? 0;
            return <span>Level: {lvl === 0 ? 'Root' : `Child ${lvl}`}</span>;
          })()}
        </div>
      )}
      <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '8px 0' }} />
      <section aria-labelledby="global-theme-heading">
        <h4 id="global-theme-heading" style={{ margin: '4px 0 6px', fontSize: 13 }}>Global Theme</h4>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Select Theme</legend>
          {available.map(id => (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="radio"
                name="theme"
                value={id}
                checked={theme === id}
                onChange={() => setTheme(id)}
              />
              <span style={{ textTransform: 'capitalize' }}>{id}</span>
            </label>
          ))}
        </fieldset>
      </section>
    </div>
  );
};
