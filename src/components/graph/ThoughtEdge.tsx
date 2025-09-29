import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

// A more visible connector: dual stroke (halo + core) for contrast on dark background.
// Works for undirected edges; if direction needed later we can add markerEnd.
export const ThoughtEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected } = props as any;
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <g data-edge-id={id}>
      {/* Outer halo for visibility (can shrink in subtle theme) */}
      <BaseEdge path={path} style={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 'var(--mf-edge-halo-width, 12)' }} />
      {/* Core line */}
      <BaseEdge path={path} markerEnd={markerEnd} style={{ stroke: selected ? 'var(--mf-handle-source)' : 'var(--mf-handle-target)', strokeWidth: 'var(--mf-edge-core-width, 4)' }} />
    </g>
  );
};

export default ThoughtEdge;
