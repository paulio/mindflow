import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { useGraph } from '../../state/graph-store';
import type { EdgeProps } from 'reactflow';

// Using broad EdgeProps to satisfy React Flow typing; we derive our data subset safely.
export const ReferenceEdge: React.FC<EdgeProps<any>> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props as any;
  const { selectedReferenceId, selectReference } = useGraph() as any;
  const isSelected = (props as any).selected || selectedReferenceId === id;
  const styleValue = data?.style || 'single';

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  // Use the same highlight colour (yellow) as structural parent/child edges when selected
  const stroke = isSelected ? '#ff0' : '#888';
  const strokeWidth = isSelected ? 3 : 2;

  const renderEnd = styleValue === 'single' || styleValue === 'double';
  const renderStart = styleValue === 'double';

  if (isSelected) {
    // eslint-disable-next-line no-console
    console.log('[ReferenceEdge render] selected', { id, style: styleValue, label: data?.label });
  }

  return (
    <>
      <svg style={{ position: 'absolute', overflow: 'visible' }}>
        {renderEnd && (
          <marker id={`ref-end-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        )}
        {renderStart && (
          <marker id={`ref-start-${id}`} viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 z" fill={stroke} />
          </marker>
        )}
      </svg>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke, strokeWidth, pointerEvents: 'stroke', cursor: 'pointer' }}
        markerEnd={renderEnd ? `url(#ref-end-${id})` : undefined}
        markerStart={renderStart ? `url(#ref-start-${id})` : undefined}
      />
      {!data?.labelHidden && data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 12,
              color: isSelected ? '#ff0' : '#bbb',
              pointerEvents: 'all',
              userSelect: 'none'
            }}
            onClick={(e) => { e.stopPropagation(); selectReference(id); }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
