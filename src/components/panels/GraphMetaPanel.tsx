import React, { useState } from 'react';
import { useGraph } from '../../state/graph-store';
import { exportGraphAsMarkdown, exportGraphAsPng, triggerDownload } from '../../lib/export';
import { useTheme } from '../../state/theme-store';

export const GraphMetaPanel: React.FC = () => {
  const { graph, nodes, edges, renameGraph, selectedNodeId, selectNode, levels, removeGraph, cloneCurrent, updateNodeColors, updateNodeZOrder, updateNoteAlignment } = useGraph() as any;
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
      {selectedNodeId && (() => {
        const node = nodes.find((n: any) => n.id === selectedNodeId);
        if (!node) return null;
        const lvl = levels.get(selectedNodeId) ?? 0;
        const palette = ['#1e222b','#2d323f','#444b5a','#556070','#6b7687','#8892a0','#b48ead','#a3be8c','#d08770','#bf616a'];
        const isNote = node.nodeKind === 'note';
  const isRect = node.nodeKind === 'rect';
  const hAlign = node.textAlign || 'center';
  const vAlign = node.textVAlign || 'middle';
  const showColorControls = isNote || isRect;
  const showZOrder = isNote || isRect; // toolbar nodes only for now
        return (
          <div style={{ fontSize: 12, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>Level: {lvl === 0 ? 'Root' : `Child ${lvl}`}</span>
            {showColorControls && (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <strong style={{ fontSize:12 }}>Colors</strong>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {palette.map(c => (
                    <button key={c} aria-label={`Set background ${c}`} onClick={() => updateNodeColors(node.id, c, node.textColor)} style={{ width:20, height:20, border: node.bgColor === c ? '2px solid #fff' : '1px solid #333', background:c, cursor:'pointer', padding:0 }} />
                  ))}
                </div>
                <label style={{ fontSize:11, display:'flex', gap:4, alignItems:'center' }}>
                  <span>Custom</span>
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="#rrggbb"
                    defaultValue={node.bgColor || ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) updateNodeColors(node.id, v, node.textColor);
                    }}
                    style={{ flex:1 }}
                  />
                </label>
                {isNote && (
                  <label style={{ fontSize:11, display:'flex', gap:4, alignItems:'center' }}>
                    <span>Text</span>
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="#rrggbb"
                      defaultValue={node.textColor || ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) updateNodeColors(node.id, node.bgColor, v);
                      }}
                      style={{ flex:1 }}
                    />
                  </label>
                )}
              </div>
            )}
            {showZOrder && (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <strong style={{ fontSize:12 }}>Z-Order</strong>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="button" aria-pressed={(node.frontFlag !== false)} onClick={() => updateNodeColors /* placeholder to keep linter quiet */} style={{ display:'none' }} />
                  <button
                    type="button"
                    onClick={() => updateNodeZOrder(node.id, true)}
                    disabled={node.frontFlag !== false}
                    style={{ background: node.frontFlag !== false ? '#3a3f4b' : '#222', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor: node.frontFlag !== false ? 'default' : 'pointer', fontSize:12 }}
                  >Front</button>
                  <button
                    type="button"
                    onClick={() => updateNodeZOrder(node.id, false)}
                    disabled={node.frontFlag === false}
                    style={{ background: node.frontFlag === false ? '#3a3f4b' : '#222', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor: node.frontFlag === false ? 'default' : 'pointer', fontSize:12 }}
                  >Behind</button>
                </div>
              </div>
            )}
            {isNote && (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <strong style={{ fontSize:12 }}>Text Align</strong>
                <div style={{ display:'flex', gap:4 }}>
                  {(['left','center','right'] as const).map(opt => (
                    <button key={opt} type="button" onClick={() => updateNoteAlignment(node.id, opt, undefined)} disabled={hAlign === opt} style={{ padding:'4px 6px', fontSize:11, background: hAlign === opt ? '#3a3f4b' : '#222', color:'#fff', border:'1px solid #444', cursor: hAlign === opt ? 'default' : 'pointer' }}>{opt[0].toUpperCase()}</button>
                  ))}
                </div>
                <strong style={{ fontSize:12 }}>Vertical</strong>
                <div style={{ display:'flex', gap:4 }}>
                  {([['top','Top'],['middle','Mid'],['bottom','Bot']] as const).map(([val,label]) => (
                    <button key={val} type="button" onClick={() => updateNoteAlignment(node.id, undefined, val as any)} disabled={vAlign === val} style={{ padding:'4px 6px', fontSize:11, background: vAlign === val ? '#3a3f4b' : '#222', color:'#fff', border:'1px solid #444', cursor: vAlign === val ? 'default' : 'pointer' }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
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
