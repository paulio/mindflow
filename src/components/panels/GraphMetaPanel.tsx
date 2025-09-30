import React, { useState } from 'react';
import { useGraph } from '../../state/graph-store';
import { exportGraphAsMarkdown, exportGraphAsPng, triggerDownload } from '../../lib/export';
import { useTheme } from '../../state/theme-store';

export const GraphMetaPanel: React.FC = () => {
  const { graph, nodes, edges, renameGraph, selectedNodeId, selectNode, levels, removeGraph, cloneCurrent } = useGraph() as any;
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
      <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '8px 0' }} />
      <section aria-labelledby="map-actions-heading">
        <h4 id="map-actions-heading" style={{ margin: '4px 0 6px', fontSize: 13 }}>Map Actions</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={async () => {
              if (!graph) return;
              const ok = window.confirm(`Delete map "${graph.name}"? This cannot be undone.`);
              if (!ok) return;
              await removeGraph(graph.id);
            }}
            style={{ background: '#2a2a30', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor:'pointer', textAlign:'left' }}
          >Delete Map</button>
          <button
            type="button"
            onClick={async () => { await cloneCurrent(); }}
            style={{ background: '#2a2a30', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor:'pointer', textAlign:'left' }}
          >Clone Map</button>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span style={{ fontSize: 12, opacity:0.7 }}>Export</span>
            <div style={{ display:'flex', gap:6 }}>
              <button type="button" style={{ background:'#222', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor:'pointer' }} onClick={async () => {
                if (!graph) return;
                const blob = await exportGraphAsPng(graph, nodes, edges);
                if (blob) triggerDownload(`${graph.name || 'graph'}.png`, blob);
              }}>PNG</button>
              <button type="button" style={{ background:'#222', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor:'pointer' }} onClick={() => {
                if (!graph) return;
                const md = exportGraphAsMarkdown(graph, nodes, edges);
                const blob = new Blob([md], { type: 'text/markdown' });
                triggerDownload(`${graph.name || 'graph'}.md`, blob as any);
              }}>Markdown</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
