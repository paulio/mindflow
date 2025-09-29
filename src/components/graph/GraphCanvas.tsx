import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, NodeProps, Node, OnNodesChange, OnEdgesChange, Connection, Handle, Position } from 'reactflow';
import { ThoughtEdge } from './ThoughtEdge';
import { useGraph } from '../../state/graph-store';
import 'reactflow/dist/style.css';
import { ThoughtNode } from '../nodes/ThoughtNode';
import { NodeHandles } from '../nodes/NodeHandles';

const handleStyle: React.CSSProperties = { width: 10, height: 10, border: '2px solid #0d0f17', background: '#555', zIndex: 1 };
const ThoughtNodeWrapper: React.FC<NodeProps> = (props) => {
  const { id, selected, xPos, yPos, data } = props as any; // xPos/yPos provided by ReactFlow
  return (
    <div style={{ position: 'relative' }}>
      <ThoughtNode id={id} text={data.label} />
      <NodeHandles nodeId={id} baseX={xPos} baseY={yPos} visible={!!selected} />
      {/* Four directional source handles */}
      <Handle type="source" id="n" position={Position.Top} style={{ ...handleStyle, background: '#4da3ff' }} />
      <Handle type="source" id="e" position={Position.Right} style={{ ...handleStyle, background: '#4da3ff' }} />
      <Handle type="source" id="s" position={Position.Bottom} style={{ ...handleStyle, background: '#4da3ff' }} />
      <Handle type="source" id="w" position={Position.Left} style={{ ...handleStyle, background: '#4da3ff' }} />
      {/* Four directional target handles */}
      <Handle type="target" id="n" position={Position.Top} style={{ ...handleStyle, background: '#ffb347' }} />
      <Handle type="target" id="e" position={Position.Right} style={{ ...handleStyle, background: '#ffb347' }} />
      <Handle type="target" id="s" position={Position.Bottom} style={{ ...handleStyle, background: '#ffb347' }} />
      <Handle type="target" id="w" position={Position.Left} style={{ ...handleStyle, background: '#ffb347' }} />
    </div>
  );
};

export const GraphCanvas: React.FC = () => {
  const { nodes, edges, startEditing, editingNodeId, moveNode, addEdge } = useGraph();
  const rfNodes = useMemo(() => nodes.map((n: { id: string; x: number; y: number; text?: string }) => ({ id: n.id, type: 'thought', position: { x: n.x, y: n.y }, data: { label: n.text || 'New Thought' }, tabIndex: 0 })), [nodes]);
  const rfEdges = useMemo(
    () => edges.map((e: any) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      sourceHandle: e.sourceHandleId,
      targetHandle: e.targetHandleId,
      type: 'thought-edge',
      selectable: true,
      data: {},
    })),
    [edges]
  );
  const onNodesChange: OnNodesChange = (changes) => {
    for (const c of changes) {
      if (c.type === 'position' && c.dragging === false && c.position) {
        moveNode(c.id, c.position.x, c.position.y);
      }
    }
  };
  const onEdgesChange: OnEdgesChange = () => { /* edge selection not yet persisted */ };
  const onConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      addEdge(connection.source, connection.target, connection.sourceHandle ?? undefined, connection.targetHandle ?? undefined);
    }
  };
  // Dev aid: log whenever edge count changes (can remove later)
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[GraphCanvas] edges updated', edges.map((e: { id: string; sourceNodeId: string; targetNodeId: string }) => ({ id: e.id, s: e.sourceNodeId, t: e.targetNodeId })));
  }, [edges]);
  const nodeTypes = useMemo(() => ({ thought: ThoughtNodeWrapper }), []);
  const edgeTypes = useMemo(() => ({ 'thought-edge': ThoughtEdge }), []);
  return (
    <div style={{ flex: 1 }}>
      <ReactFlow
  nodes={rfNodes}
  edges={rfEdges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
        fitView
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
        zoomOnDoubleClick={false}
        onNodeDoubleClick={(e: React.MouseEvent, node: Node) => {
          e.preventDefault();
          e.stopPropagation();
          if (editingNodeId !== node.id) startEditing(node.id);
        }}
        onConnect={onConnect}
        nodesDraggable
        nodesConnectable={true}
        elementsSelectable
        connectOnClick={false}
        onPaneClick={(e) => {
          // Example future enhancement: add node where user clicks.
          // const bounds = (e.target as HTMLElement).getBoundingClientRect();
          // addNode(e.clientX - bounds.left, e.clientY - bounds.top);
        }}
        defaultEdgeOptions={{ type: 'thought-edge', style: { pointerEvents: 'none' } }}
        style={{ background: '#0d0f17' }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
