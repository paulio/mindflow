import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, NodeProps, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraph } from '../../state/graph-store';
import { ThoughtNode } from '../nodes/ThoughtNode';
import { NodeHandles } from '../nodes/NodeHandles';

const ThoughtNodeWrapper: React.FC<NodeProps> = (props) => {
  const { id, selected, xPos, yPos, data } = props as any; // xPos/yPos provided by ReactFlow
  return (
    <div style={{ position: 'relative' }}>
      <ThoughtNode id={id} text={data.label} />
      <NodeHandles nodeId={id} baseX={xPos} baseY={yPos} visible={!!selected} />
    </div>
  );
};

export const GraphCanvas: React.FC = () => {
  const { nodes, edges, startEditing, editingNodeId } = useGraph();
  const rfNodes = useMemo(() => nodes.map(n => ({ id: n.id, type: 'thought', position: { x: n.x, y: n.y }, data: { label: n.text || 'New Thought' }, tabIndex: 0 })), [nodes]);
  const rfEdges = useMemo(() => edges.map(e => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId })), [edges]);
  const nodeTypes = useMemo(() => ({ thought: ThoughtNodeWrapper }), []);
  return (
    <div style={{ flex: 1 }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        zoomOnDoubleClick={false} // allow node double-click to bubble to content for edit mode
        onNodeDoubleClick={(e: React.MouseEvent, node: Node) => {
          e.preventDefault();
          e.stopPropagation();
          if (editingNodeId !== node.id) startEditing(node.id);
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
