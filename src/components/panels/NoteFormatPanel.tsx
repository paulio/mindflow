import React, { useEffect, useState } from 'react';
import { useGraph } from '../../state/graph-store';
import { detectAvailableFonts } from '../../lib/font-detect';

export const NoteFormatPanel: React.FC = () => {
  const { nodes, selectedNodeId, updateNoteFormatting, resetNoteFormatting } = useGraph() as any;
  const node = nodes.find((n: any) => n.id === selectedNodeId && n.nodeKind === 'note');
  const [fonts, setFonts] = useState<string[]>([]);
  useEffect(() => { detectAvailableFonts().then(setFonts); }, []);
  if (!node) return null;

  function update(patch: any) { updateNoteFormatting(node.id, patch); }
  const disabled = !node;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
      <strong style={{ fontSize:12 }}>Formatting</strong>
      <label style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span>Font</span>
        <select value={node.fontFamily || ''} onChange={e => update({ fontFamily: e.target.value })} disabled={disabled} style={{ fontSize:12 }}>
          {fonts.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <label style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span>Size</span>
        <input type="number" min={10} max={48} value={node.fontSize || 14} onChange={e => update({ fontSize: parseInt(e.target.value,10) })} style={{ width:70 }} />
      </label>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        <button type="button" aria-pressed={node.fontWeight === 'bold' || node.fontWeight === 700} onClick={() => update({ fontWeight: (node.fontWeight === 'bold' || node.fontWeight === 700) ? 'normal' : 'bold' })} style={{ padding:'4px 6px', fontWeight: node.fontWeight === 'bold' ? 700 : 400 }}>B</button>
        <button type="button" aria-pressed={!!node.italic} onClick={() => update({ italic: !node.italic })} style={{ padding:'4px 6px', fontStyle: node.italic ? 'italic' : 'normal' }}>I</button>
        <button
          type="button"
          aria-label="Toggle highlight"
          aria-pressed={!!node.highlight}
          onClick={() => update({ highlight: !node.highlight })}
          style={{ padding:'4px 6px', background: node.highlight ? '#ffeb3b' : '#2d323f', color: node.highlight ? '#222' : '#ffeb3b', display:'flex', alignItems:'center', justifyContent:'center', border: node.highlight ? '1px solid #ffe733' : '1px solid #444', borderRadius: 4, boxShadow: node.highlight ? '0 0 0 1px #222 inset' : 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false" style={{ display:'block' }}>
            <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 15 16.8 5.2a2 2 0 1 1 2.8 2.8L9.8 17.8 6 18l1-3z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <label style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span>BG Opacity</span>
        <input type="range" min={0} max={100} step={5} value={node.backgroundOpacity ?? 100} onChange={e => update({ backgroundOpacity: parseInt(e.target.value,10) })} />
        <span style={{ fontSize:10 }}>{node.backgroundOpacity ?? 100}%</span>
      </label>
      <label style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span>Overflow</span>
        <select value={node.overflowMode || 'auto-resize'} onChange={e => update({ overflowMode: e.target.value })} style={{ fontSize:12 }}>
          <option value="auto-resize">Auto-Resize</option>
          <option value="truncate">Truncate</option>
          <option value="scroll">Scroll</option>
        </select>
      </label>
      <label style={{ display:'flex', alignItems:'center', gap:4 }}>
        <input type="checkbox" checked={!!node.hideShapeWhenUnselected} onChange={e => update({ hideShapeWhenUnselected: e.target.checked })} />
        <span>Hide Shape When Unselected</span>
      </label>
      <div style={{ display:'flex', gap:6 }}>
        <button type="button" onClick={() => resetNoteFormatting(node.id)} style={{ padding:'4px 8px', fontSize:12 }}>Reset</button>
      </div>
    </div>
  );
};
