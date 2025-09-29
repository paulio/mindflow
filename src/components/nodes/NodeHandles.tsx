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
  if (!graph || !visible) return null;
  function onPointerDown(dir: keyof typeof offsets, ev: React.PointerEvent) {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    startRef.current = { x: ev.clientX, y: ev.clientY, dir };
  }
  function onPointerUp(ev: React.PointerEvent) {
    if (!startRef.current) return;
    const { x: sx, y: sy, dir } = startRef.current;
    const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy);
    if (dist >= DRAG_THRESHOLD) {
      const [dx, dy] = offsets[dir];
      addConnectedNode(nodeId, baseX + dx, baseY + dy);
    }
    startRef.current = null;
  }
  const btnStyle: React.CSSProperties = { position: 'absolute', width: 20, height: 20, borderRadius: '50%', fontSize: 10, background: '#333', color: '#ddd', border: '1px solid #444', cursor: 'pointer' };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <button
        aria-label="Create node north"
        style={{ ...btnStyle, top: -24, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
        onPointerDown={e=>onPointerDown('north',e)}
        onPointerUp={onPointerUp}
      >N</button>
      <button
        aria-label="Create node south"
        style={{ ...btnStyle, bottom: -24, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
        onPointerDown={e=>onPointerDown('south',e)}
        onPointerUp={onPointerUp}
      >S</button>
      <button
        aria-label="Create node east"
        style={{ ...btnStyle, right: -24, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
        onPointerDown={e=>onPointerDown('east',e)}
        onPointerUp={onPointerUp}
      >E</button>
      <button
        aria-label="Create node west"
        style={{ ...btnStyle, left: -24, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
        onPointerDown={e=>onPointerDown('west',e)}
        onPointerUp={onPointerUp}
      >W</button>
    </div>
  );
};
