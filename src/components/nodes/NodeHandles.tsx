import React, { useRef } from 'react';
import { useGraph } from '../../state/graph-store';

interface Props { nodeId: string; baseX: number; baseY: number; visible: boolean; }
// Directional offsets for new node placement relative to source node position
const offsets = { north: [0, -120], south: [0, 120], east: [160, 0], west: [-160, 0] } as const;
// Drag distance (pixels) required to trigger creation (spec FR-020 requires >=80px to create, else cancel)
const DRAG_THRESHOLD = 80;

export const NodeHandles: React.FC<Props> = ({ nodeId, baseX, baseY, visible }) => {
  const { addConnectedNode, graph } = useGraph();
  const startRef = useRef<{x:number;y:number;dir:keyof typeof offsets}|null>(null);
  if (!graph) return null;
  function onPointerDown(dir: keyof typeof offsets, ev: React.PointerEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch {}
    startRef.current = { x: ev.clientX, y: ev.clientY, dir };
    // eslint-disable-next-line no-console
    console.debug('[NodeHandles] pointerDown', { dir, x: ev.clientX, y: ev.clientY });
  }
  function onPointerUp(ev: React.PointerEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    if (!startRef.current) return;
    const { x: sx, y: sy, dir } = startRef.current;
    const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy);
    // eslint-disable-next-line no-console
    console.debug('[NodeHandles] pointerUp', { dir, dist, threshold: DRAG_THRESHOLD });
    if (dist >= DRAG_THRESHOLD) {
      const [dx, dy] = offsets[dir];
      const sourceHandleId = dir[0];
      const opposite: Record<string,string> = { north: 's', south: 'n', east: 'w', west: 'e' };
      const targetHandleId = opposite[dir];
  // eslint-disable-next-line no-console
  console.debug('[NodeHandles] creating connected node', { nodeId, dir, baseX, baseY, dx, dy, sourceHandleId, targetHandleId });
  addConnectedNode(nodeId, baseX + dx, baseY + dy, sourceHandleId, targetHandleId);
    }
    startRef.current = null;
  }
  const btnStyle: React.CSSProperties = { position: 'absolute', width: 20, height: 20, borderRadius: '50%', fontSize: 10, background: '#333', color: '#ddd', border: '1px solid #444', cursor: 'pointer' };
  const dirColors: Record<string, {bg:string;border:string;shadow:string}> = {
    north: { bg: '#1d4ed8', border: '#93c5fd', shadow: 'rgba(147,197,253,0.55)' },
    south: { bg: '#059669', border: '#6ee7b7', shadow: 'rgba(110,231,183,0.55)' },
    east:  { bg: '#7c3aed', border: '#c4b5fd', shadow: 'rgba(196,181,253,0.55)' },
    west:  { bg: '#ea580c', border: '#fdba74', shadow: 'rgba(253,186,116,0.55)' }
  };
  const vividBtn = (dir:keyof typeof offsets, posStyle: React.CSSProperties, label: string) => {
    const c = dirColors[dir];
    return (
      <button
        aria-label={`Create node ${dir}`}
        style={{
          position: 'absolute',
          width: 28,
          height: 28,
          borderRadius: '50%',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: c.bg,
          color: '#fff',
          border: `2px solid ${c.border}`,
          boxShadow: `0 0 0 2px rgba(0,0,0,0.45), 0 0 6px 2px ${c.shadow}`,
          cursor: 'grab',
          userSelect: 'none',
          transition: 'transform .12s, box-shadow .12s, background .12s',
          ...posStyle,
          pointerEvents: 'auto'
        }}
        onPointerDown={e=>onPointerDown(dir,e)}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >{label}</button>
    );
  };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, opacity: visible ? 1 : 0.4 }}>
      {vividBtn('north', { top: -30, left: '50%', transform: 'translateX(-50%)' }, 'N')}
      {vividBtn('south', { bottom: -30, left: '50%', transform: 'translateX(-50%)' }, 'S')}
      {vividBtn('east',  { right: -30, top: '50%', transform: 'translateY(-50%)' }, 'E')}
      {vividBtn('west',  { left: -30, top: '50%', transform: 'translateY(-50%)' }, 'W')}
    </div>
  );
};
