import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

// A more visible connector: dual stroke (halo + core) for contrast on dark background.
// Works for undirected edges; if direction needed later we can add markerEnd.
export const ThoughtEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected } = props as any;
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <g data-edge-id={id}>
      {/* Outer halo for visibility */}
  <BaseEdge path={path} style={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 12 }} />
      {/* Core line */}
  <BaseEdge path={path} markerEnd={markerEnd} style={{ stroke: selected ? '#ffb347' : '#4da3ff', strokeWidth: 4 }} />
    </g>
  );
};

export default ThoughtEdge;
