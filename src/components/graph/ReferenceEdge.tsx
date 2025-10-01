import React from 'react';
import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

// Final ReferenceEdge using EdgeLabelRenderer; markers are provided by React Flow via markerStart/markerEnd props (objects -> url refs).
export const ReferenceEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerStart, markerEnd, selected } = props as any;
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const isSelected = !!selected;
  const stroke = isSelected ? '#ff0' : '#888';
  const strokeWidth = isSelected ? 3 : 2;
  const showLabel = data && !data.labelHidden && data.label;
  const lines: string[] = showLabel ? String(data.label).split(/\r?\n/) : [];
  const fontSize = 12;
  const lineHeight = Math.round(fontSize * 1.2);
  const totalHeight = lines.length * lineHeight;
  const firstLineBaselineY = labelY - (totalHeight - lineHeight) / 2;
  // Estimate text width per line (monospace approximation fallback). We could also store measurement in data if precision needed.
  const approxCharWidth = fontSize * 0.62; // heuristic for typical UI font
  const lineWidths = lines.map(l => Math.max(1, l.length * approxCharWidth));
  const maxLineWidth = lineWidths.length ? Math.max(...lineWidths) : 0;
  const horizontalPadding = 6;
  const rectWidth = Math.ceil(maxLineWidth + horizontalPadding * 2);
  const rectX = labelX - rectWidth / 2;
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke, strokeWidth, pointerEvents: 'stroke', cursor: 'pointer' }}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {showLabel && (
        <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
          <rect
            x={rectX}
            y={firstLineBaselineY - lineHeight + 4}
            rx={4}
            ry={4}
            width={rectWidth}
            height={totalHeight + 4}
            fill="#1b1d22"
            stroke="none"
          />
          <text
            x={labelX}
            y={firstLineBaselineY}
            fontSize={fontSize}
            fontFamily="inherit"
            fill={isSelected ? '#ff0' : '#ddd'}
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            {lines.map((ln, i) => (
              <tspan key={i} x={labelX} dy={i === 0 ? 0 : lineHeight}>{ln === '' ? ' ' : ln}</tspan>
            ))}
          </text>
        </svg>
      )}
    </>
  );
};
