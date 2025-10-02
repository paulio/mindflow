import React, { useRef, useState, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { useGraph } from '../../state/graph-store';

interface Props { nodeId: string; baseX: number; baseY: number; visible: boolean; }
// Nominal direction vectors retained only for initial direction sign reference.
const nominalDirection = { north: [0, -120], south: [0, 120], east: [160, 0], west: [-160, 0] } as const;
// Drag distance (pixels) required to trigger creation; reduced from 80 to 40 (user request)
const DRAG_THRESHOLD = 40;

export const NodeHandles: React.FC<Props> = ({ nodeId, baseX, baseY, visible }) => {
  const { addConnectedNode, graph } = useGraph();
  const startRef = useRef<{
    originClientX: number;
    originClientY: number;
    originLocalX: number; // pixel within node
    originLocalY: number;
    anchorGraphX: number;
    anchorGraphY: number;
    dir: keyof typeof nominalDirection;
  }|null>(null);
  const [preview, setPreview] = useState<{active:boolean; dir?: keyof typeof nominalDirection; dist:number; dx:number; dy:number; originLocalX:number; originLocalY:number}>({ active: false, dist: 0, dx: 0, dy: 0, originLocalX: 0, originLocalY: 0 });
  const rf = useReactFlow();
  const containerRef = useRef<HTMLDivElement|null>(null);
  if (!graph) return null;
  function onPointerDown(dir: keyof typeof nominalDirection, ev: React.PointerEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch {}
    const host = containerRef.current?.parentElement; // Node wrapper div (positioned at node top-left)
    const rect = host?.getBoundingClientRect();
    const nodeW = rect?.width ?? 120;
    const nodeH = rect?.height ?? 40;
    // Anchor per direction (center of chosen side)
    let originLocalX = nodeW / 2; let originLocalY = nodeH / 2;
    if (dir === 'north') { originLocalY = 0; }
    if (dir === 'south') { originLocalY = nodeH; }
    if (dir === 'east')  { originLocalX = nodeW; }
    if (dir === 'west')  { originLocalX = 0; }
    const originClientX = (rect?.left ?? ev.clientX) + originLocalX;
    const originClientY = (rect?.top ?? ev.clientY) + originLocalY;
  // React Flow: project() deprecated; use screenToFlowPosition()
  const anchorGraph = rf.screenToFlowPosition({ x: originClientX, y: originClientY });
    startRef.current = {
      originClientX,
      originClientY,
      originLocalX,
      originLocalY,
      anchorGraphX: anchorGraph.x,
      anchorGraphY: anchorGraph.y,
      dir
    };
    // eslint-disable-next-line no-console
    console.debug('[NodeHandles] pointerDown', { dir, client: { x: ev.clientX, y: ev.clientY }, originClientX, originClientY });
    setPreview({ active: true, dir, dist: 0, dx: 0, dy: 0, originLocalX, originLocalY });
  }
  const finish = useCallback(() => { setPreview({ active: false, dist: 0, dx: 0, dy: 0, originLocalX: 0, originLocalY: 0 }); startRef.current = null; }, []);
  function onPointerMove(ev: React.PointerEvent) {
    if (!startRef.current) return;
    const { originClientX, originClientY, dir, originLocalX, originLocalY } = startRef.current;
    const rawDx = ev.clientX - originClientX; // pixels
    const rawDy = ev.clientY - originClientY; // pixels
    let dx = 0, dy = 0;
    if (dir === 'north') { dy = Math.min(0, rawDy); }
    if (dir === 'south') { dy = Math.max(0, rawDy); }
    if (dir === 'east')  { dx = Math.max(0, rawDx); }
    if (dir === 'west')  { dx = Math.min(0, rawDx); }
    const dist = Math.hypot(dx, dy);
    setPreview(p => ({ ...p, dist, dir, dx, dy, originLocalX, originLocalY }));
  }
  function onPointerUp(ev: React.PointerEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    if (!startRef.current) return;
    const { dir, anchorGraphX, anchorGraphY, originLocalX, originLocalY, originClientX, originClientY } = startRef.current;
    // Recompute graph-space delta using project() for accuracy with zoom/pan.
  const pointerGraph = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
    let gdx = pointerGraph.x - anchorGraphX;
    let gdy = pointerGraph.y - anchorGraphY;
    if (dir === 'north') { gdy = Math.min(0, gdy); gdx = 0; }
    if (dir === 'south') { gdy = Math.max(0, gdy); gdx = 0; }
    if (dir === 'east')  { gdx = Math.max(0, gdx); gdy = 0; }
    if (dir === 'west')  { gdx = Math.min(0, gdx); gdy = 0; }
    const dist = Math.hypot(gdx, gdy); // graph-space distance (scaled by zoom already)
    // eslint-disable-next-line no-console
    console.debug('[NodeHandles] pointerUp', { dir, dist, threshold: DRAG_THRESHOLD });
    if (dist >= DRAG_THRESHOLD) {
      const sourceHandleId = dir[0];
      const opposite: Record<string,string> = { north: 's', south: 'n', east: 'w', west: 'e' };
      const targetHandleId = opposite[dir];
  // eslint-disable-next-line no-console
      const NEW_W = 120; const NEW_H = 40; // nominal
      // anchorGraphX/Y represent center of source side; we offset by gdx/gdy to get new node center.
      const newCenterX = anchorGraphX + gdx;
      const newCenterY = anchorGraphY + gdy;
      const newX = newCenterX - NEW_W / 2;
      const newY = newCenterY - NEW_H / 2;
      console.debug('[NodeHandles] creating connected node', { nodeId, dir, newX, newY, gdx, gdy, anchorGraphX, anchorGraphY, sourceHandleId, targetHandleId });
      addConnectedNode(nodeId, newX, newY, sourceHandleId, targetHandleId);
    }
    finish();
  }
  const btnStyle: React.CSSProperties = { position: 'absolute', width: 20, height: 20, borderRadius: '50%', fontSize: 10, background: '#333', color: '#ddd', border: '1px solid #444', cursor: 'pointer' };
  const dirColors: Record<string, {bg:string;border:string;shadow:string}> = {
    north: { bg: '#1d4ed8', border: '#93c5fd', shadow: 'rgba(147,197,253,0.55)' },
    south: { bg: '#059669', border: '#6ee7b7', shadow: 'rgba(110,231,183,0.55)' },
    east:  { bg: '#7c3aed', border: '#c4b5fd', shadow: 'rgba(196,181,253,0.55)' },
    west:  { bg: '#ea580c', border: '#fdba74', shadow: 'rgba(253,186,116,0.55)' }
  };
  const vividBtn = (dir:keyof typeof nominalDirection, posStyle: React.CSSProperties, label: string) => {
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
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >{label}</button>
    );
  };
  return (
  <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, opacity: visible ? 1 : 0.4 }}>
      {vividBtn('north', { top: -30, left: '50%', transform: 'translateX(-50%)' }, 'N')}
      {vividBtn('south', { bottom: -30, left: '50%', transform: 'translateX(-50%)' }, 'S')}
      {vividBtn('east',  { right: -30, top: '50%', transform: 'translateY(-50%)' }, 'E')}
      {vividBtn('west',  { left: -30, top: '50%', transform: 'translateY(-50%)' }, 'W')}
      {preview.active && preview.dir && (
        <div style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
          {(() => {
            const reached = preview.dist >= DRAG_THRESHOLD;
            const stroke = reached ? '#4da3ff' : 'rgba(255,255,255,0.35)';
            const dash = reached ? '0' : '6 6';
            const { dx, dy, originLocalX, originLocalY } = preview;
            return (
              <svg width={1} height={1} style={{ overflow: 'visible', position: 'absolute', left: originLocalX, top: originLocalY }}>
                <line x1={0} y1={0} x2={dx} y2={dy} stroke={stroke} strokeWidth={3} strokeDasharray={dash} />
                <g transform={`translate(${dx - 60}, ${dy - 20})`}>
                  <rect width={120} height={40} rx={8} fill={reached ? 'rgba(77,163,255,0.25)' : 'rgba(255,255,255,0.12)'} stroke={reached ? '#4da3ff' : 'rgba(255,255,255,0.4)'} strokeDasharray={reached ? '0' : '4 4'} />
                  <text x={60} y={22} textAnchor="middle" fontSize={12} fill="#fff" style={{ pointerEvents: 'none', userSelect: 'none' }}>New</text>
                </g>
                <circle cx={0} cy={0} r={4} fill="#fff" />
                <circle cx={dx} cy={dy} r={4} fill={reached ? '#4da3ff' : 'rgba(255,255,255,0.5)'} />
                <text x={0} y={-8} textAnchor="middle" fontSize={10} fill="#ccc">{Math.round(preview.dist)}px</text>
              </svg>
            );
          })()}
        </div>
      )}
    </div>
  );
};
