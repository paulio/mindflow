import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

// A more visible connector: dual stroke (halo + core) for contrast on dark background.
// Works for undirected edges; if direction needed later we can add markerEnd.
export const ThoughtEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected } = props as any;
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <g data-edge-id={id}>
      {/* Outer halo for visibility (theme controls width + color) */}
      <BaseEdge
        path={path}
        style={{
          stroke: 'var(--mf-edge-halo-color, rgba(255,255,255,0.2))',
          strokeWidth: 'var(--mf-edge-halo-width, 12)',
          pointerEvents: 'none'
        }}
      />
      {/* Core line (opaque, not affected by semi-transparent handle tokens) */}
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? 'var(--mf-edge-core-color-selected, #ffd84f)' : 'var(--mf-edge-core-color, #4f9dff)',
          strokeWidth: 'var(--mf-edge-core-width, 4)',
          pointerEvents: 'stroke'
        }}
      />
    </g>
  );
};

export default ThoughtEdge;
