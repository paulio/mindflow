import React, { useState } from 'react';
import { useGraph } from '../../state/graph-store';
import { BORDER_COLOUR_PALETTE } from '../../lib/node-border-palette';
import { exportGraphAsMarkdown, exportGraphAsPng, triggerDownload } from '../../lib/export';
import { useTheme } from '../../state/theme-store';
import { NoteFormatPanel } from './NoteFormatPanel';

export const GraphMetaPanel: React.FC = () => {
  const { graph, nodes, edges, renameGraph, selectedNodeId, selectNode, levels, removeGraph, cloneCurrent, updateNodeColors, updateNodeZOrder, updateNoteAlignment, references, selectedReferenceId, selectReference, updateReferenceStyle, updateReferenceLabel, toggleReferenceLabelVisibility, deleteReference, overrideNodeBorder, clearNodeBorderOverride, getNodeBorderInfo } = useGraph() as any;
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
  const palette = BORDER_COLOUR_PALETTE;
    const isNote = node.nodeKind === 'note';
  const isRect = node.nodeKind === 'rect';
  const isThought = !node.nodeKind || node.nodeKind === 'thought';
  const hAlign = node.textAlign || 'center';
  const vAlign = node.textVAlign || 'middle';
  const showColorControls = isNote || isRect || isThought;
  const showZOrder = isNote || isRect; // toolbar nodes only for now
        return (
          <div style={{ fontSize: 12, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>Level: {lvl === 0 ? 'Root' : `Child ${lvl}`}</span>
            {showColorControls && (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <strong style={{ fontSize:12 }}>Colors</strong>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {palette.map(c => (
                    <button
                      key={c}
                      aria-label={`Set background ${c}`}
                      onClick={() => updateNodeColors(node.id, c, node.textColor)}
                      style={{ width:20, height:20, border: node.bgColor === c ? '2px solid #fff' : '1px solid #333', background:c, cursor:'pointer', padding:0 }}
                    />
                  ))}
                </div>
            {/* Border Colour Override Section */}
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <strong style={{ fontSize:12 }}>Border Colour</strong>
              {(() => {
                const info = getNodeBorderInfo(node.id);
                if (!info) return null;
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {palette.map(c => {
                        const active = info.colour === c && info.overridden;
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-label={`Set border colour ${c}`}
                            onClick={() => overrideNodeBorder(node.id, c)}
                            style={{ width:20, height:20, background:c, border: active ? '2px solid #fff' : '1px solid #333', cursor:'pointer', padding:0 }}
                          />
                        );
                      })}
                    </div>
                    <label style={{ fontSize:11, display:'flex', gap:4, alignItems:'center' }}>
                      <span>Custom Border</span>
                      <input
                        type="text"
                        maxLength={7}
                        placeholder="#rrggbb"
                        defaultValue={info.overridden ? info.colour : ''}
                        onBlur={(e) => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) overrideNodeBorder(node.id, v); }}
                        style={{ flex:1 }}
                      />
                    </label>
                    <div style={{ display:'flex', gap:6 }}>
                      <button
                        type="button"
                        aria-label="Clear border override"
                        disabled={!info.overridden}
                        onClick={() => clearNodeBorderOverride(node.id)}
                        style={{ background: info.overridden ? '#2a2f38' : '#1a1c21', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor: info.overridden ? 'pointer' : 'default', fontSize:12 }}
                      >Reset</button>
                      <span style={{ fontSize:11, opacity:0.7, alignSelf:'center' }}>{info.overridden ? 'Overridden Border' : 'Default Border'}</span>
                    </div>
                  </div>
                );
              })()}
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
                  {(['left','center','right'] as const).map(opt => {
                    const active = hAlign === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-label={`Align ${opt}`}
                        onClick={() => updateNoteAlignment(node.id, opt, undefined)}
                        disabled={active}
                        style={{
                          padding:4,
                          width:36,
                          height:32,
                          background: active ? '#3a3f4b' : '#222',
                          color:'#fff',
                          border:'1px solid #444',
                          cursor: active ? 'default' : 'pointer',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center'
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
                          {/* Container guide (optional faint) */}
                          <rect x="3.5" y="4" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.25" fill="none" />
                          {opt === 'left' && (
                            <>
                              <path d="M6 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M6 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M6 16h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </>
                          )}
                          {opt === 'center' && (
                            <>
                              <path d="M7 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M6 16h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </>
                          )}
                          {opt === 'right' && (
                            <>
                              <path d="M9 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M12 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M10 16h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </>
                          )}
                        </svg>
                      </button>
                    );
                  })}
                </div>
                <strong style={{ fontSize:12 }}>Vertical</strong>
                <div style={{ display:'flex', gap:4 }}>
                  {([['top','Top'],['middle','Middle'],['bottom','Bottom']] as const).map(([val,label]) => {
                    const active = vAlign === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        aria-label={`Align vertical ${label}`}
                        onClick={() => updateNoteAlignment(node.id, undefined, val as any)}
                        disabled={active}
                        style={{
                          padding:4,
                          width:36,
                          height:32,
                          background: active ? '#3a3f4b' : '#222',
                          color:'#fff',
                          border:'1px solid #444',
                          cursor: active ? 'default' : 'pointer',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center'
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false">
                          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.25" fill="none" />
                          {val === 'top' && (
                            <>
                              <rect x="7" y="6.5" width="10" height="3.5" rx="1" fill="currentColor" opacity="0.8" />
                              <rect x="9" y="12" width="6" height="3" rx="1" fill="currentColor" opacity="0.4" />
                            </>
                          )}
                          {val === 'middle' && (
                            <>
                              <rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor" opacity="0.8" />
                              <rect x="9" y="6.5" width="6" height="3" rx="1" fill="currentColor" opacity="0.4" />
                              <rect x="9" y="15.5" width="6" height="3" rx="1" fill="currentColor" opacity="0.4" />
                            </>
                          )}
                          {val === 'bottom' && (
                            <>
                              <rect x="7" y="14.5" width="10" height="3.5" rx="1" fill="currentColor" opacity="0.8" />
                              <rect x="9" y="8.5" width="6" height="3" rx="1" fill="currentColor" opacity="0.4" />
                            </>
                          )}
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isNote && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <NoteFormatPanel />
              </div>
            )}
          </div>
        );
      })()}
      {!selectedNodeId && selectedReferenceId && (() => {
        const ref = references.find((r: any) => r.id === selectedReferenceId);
        if (!ref) return null;
        return (
          <div style={{ fontSize:12, marginTop:6, display:'flex', flexDirection:'column', gap:8 }}>
            <strong>Reference Connection</strong>
            <div style={{ display:'flex', gap:6 }}>
              {(['single','double','none'] as const).map(styleOpt => (
                <button
                  key={styleOpt}
                  type="button"
                  onClick={() => updateReferenceStyle(ref.id, styleOpt)}
                  disabled={ref.style === styleOpt}
                  style={{
                    background: ref.style === styleOpt ? '#3a3f4b' : '#222',
                    color:'#fff',
                    border:'1px solid #444',
                    padding:'4px 8px',
                    cursor: ref.style === styleOpt ? 'default' : 'pointer',
                    fontSize:12
                  }}
                >{styleOpt === 'single' ? '→' : styleOpt === 'double' ? '↔' : '––'}</button>
              ))}
            </div>
            <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ opacity:0.8 }}>Label (multi-line)</span>
              <textarea
                defaultValue={ref.label}
                maxLength={255}
                rows={3}
                onBlur={(e) => updateReferenceLabel(ref.id, e.target.value)}
                placeholder="Enter label (Shift+Enter for new line)"
                style={{ background:'#181a1f', color:'#fff', border:'1px solid #333', padding:4, resize:'vertical', fontFamily:'inherit', fontSize:12, lineHeight:1.3 }}
              />
            </label>
            <label style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input
                type="checkbox"
                checked={!!ref.labelHidden}
                onChange={(e) => toggleReferenceLabelVisibility(ref.id, e.target.checked)}
              />
              <span>Hide label</span>
            </label>
            <div>
              <button
                type="button"
                onClick={() => { deleteReference(ref.id); selectReference(null); }}
                style={{ background:'#2a2a30', color:'#fff', padding:'4px 8px', border:'1px solid #444', cursor:'pointer', fontSize:12 }}
              >Delete Reference</button>
            </div>
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
                const blob = await exportGraphAsPng(graph, nodes, edges, { persistThumbnail: true, trigger: 'export' });
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
