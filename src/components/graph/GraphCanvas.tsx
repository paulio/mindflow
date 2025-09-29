import React, { useMemo, useRef, useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, NodeProps, Node, OnNodesChange, OnEdgesChange, Connection, Handle, Position, OnConnectStart, OnConnectEnd, useReactFlow, applyNodeChanges } from 'reactflow';
import { ThoughtEdge } from './ThoughtEdge';
import { useGraph } from '../../state/graph-store';
import 'reactflow/dist/style.css';
import { ThoughtNode } from '../nodes/ThoughtNode';
// Custom directional ghost/drag handles removed in favor of native React Flow connection UX.

const handleStyle: React.CSSProperties = { width: 10, height: 10, border: '2px solid #0d0f17', background: '#555', zIndex: 1 };
const ThoughtNodeWrapper: React.FC<NodeProps> = (props) => {
  const { id, data, selected } = props as any;
  return (
    <div style={{ position: 'relative' }}>
      <ThoughtNode id={id} text={data.label} selected={!!selected} />
      {/* Directional source handles */}
      <Handle type="source" id="n" position={Position.Top} style={{ ...handleStyle, background: '#4da3ff' }} />
      <Handle type="source" id="e" position={Position.Right} style={{ ...handleStyle, background: '#4da3ff' }} />
      <Handle type="source" id="s" position={Position.Bottom} style={{ ...handleStyle, background: '#4da3ff' }} />
      <Handle type="source" id="w" position={Position.Left} style={{ ...handleStyle, background: '#4da3ff' }} />
      {/* Directional target handles */}
      <Handle type="target" id="n" position={Position.Top} style={{ ...handleStyle, background: '#ffb347' }} />
      <Handle type="target" id="e" position={Position.Right} style={{ ...handleStyle, background: '#ffb347' }} />
      <Handle type="target" id="s" position={Position.Bottom} style={{ ...handleStyle, background: '#ffb347' }} />
      <Handle type="target" id="w" position={Position.Left} style={{ ...handleStyle, background: '#ffb347' }} />
    </div>
  );
};

export const GraphCanvas: React.FC = () => {
  const { nodes, edges, startEditing, editingNodeId, moveNode, addEdge, addNode } = useGraph();
  // Local React Flow controlled nodes (decoupled from store during drag for stability)
  const [flowNodes, setFlowNodes] = useState<any[]>([]);
  // Initialize / merge store nodes into local state (add new, update labels). Positions updated when not currently dragging.
  useEffect(() => {
    setFlowNodes(cur => {
      const byId = new Map(cur.map(n => [n.id, n]));
      const next = nodes.map((n: any) => {
        const existing = byId.get(n.id);
        if (existing) {
          // Keep existing position while dragging; we'll overwrite on commit via moveNode.
          return { ...existing, data: { label: n.text || 'New Thought' } };
        }
        return { id: n.id, type: 'thought', position: { x: n.x, y: n.y }, data: { label: n.text || 'New Thought' }, tabIndex: 0 };
      });
      return next;
    });
  }, [nodes]);
  const rfInstance = useReactFlow();
  // Track the start of a connection drag so we can create a node if released on pane.
  const connectStartRef = useRef<{ nodeId: string; handleId?: string; startClientX: number; startClientY: number } | null>(null);

  const DRAG_THRESHOLD = 80; // px in flow space (after zoom scaling) consistent with earlier spec
  const rfNodes = flowNodes; // already memoized by state
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
    setFlowNodes(ns => applyNodeChanges(changes, ns));
  };
  const onNodeDragStop = (_: React.MouseEvent, node: Node) => {
    // Persist final position to store
    moveNode(node.id, node.position.x, node.position.y);
  };
  const onEdgesChange: OnEdgesChange = () => { /* edge selection not yet persisted */ };
  const onConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      addEdge(connection.source, connection.target, connection.sourceHandle ?? undefined, connection.targetHandle ?? undefined);
    }
  };

  const onConnectStart: OnConnectStart = (evt, params) => {
    if (!params.nodeId) return;
    let clientX = 0; let clientY = 0;
    if ('clientX' in evt) {
      clientX = (evt as any).clientX;
      clientY = (evt as any).clientY;
    } else if ('touches' in evt && evt.touches.length) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    }
    connectStartRef.current = { nodeId: params.nodeId, handleId: params.handleId as string | undefined, startClientX: clientX, startClientY: clientY };
  };

  const onConnectEnd: OnConnectEnd = (evt) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start) return;
    const target = evt.target as HTMLElement | null;
    // If released on pane (not on another handle) create a new node.
    if (target && target.classList.contains('react-flow__pane')) {
      let clientX = 0; let clientY = 0;
      if ('clientX' in evt) {
        clientX = (evt as any).clientX;
        clientY = (evt as any).clientY;
      } else if ('touches' in evt && (evt as any).touches?.length) {
        clientX = (evt as any).touches[0].clientX;
        clientY = (evt as any).touches[0].clientY;
      }
      const startGraph = rfInstance.screenToFlowPosition({ x: start.startClientX, y: start.startClientY });
      const endGraph = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });
      const dx = endGraph.x - startGraph.x;
      const dy = endGraph.y - startGraph.y;
      const dist = Math.hypot(dx, dy);
      if (dist < DRAG_THRESHOLD) {
        return; // below threshold: cancel creation
      }
      // Create node centered at drop point.
      const NEW_W = 120; const NEW_H = 40; // could be measured if needed
      const newNode = addNode(endGraph.x - NEW_W / 2, endGraph.y - NEW_H / 2);
      if (newNode) {
        const opposite: Record<string, string> = { n: 's', s: 'n', e: 'w', w: 'e' };
        const sourceHandleId = start.handleId;
        const targetHandleId = sourceHandleId ? opposite[sourceHandleId] : undefined;
        addEdge(start.nodeId, newNode.id, sourceHandleId, targetHandleId);
        startEditing(newNode.id);
      }
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
  onNodeDragStop={onNodeDragStop}
        zoomOnDoubleClick={false}
        onNodeDoubleClick={(e: React.MouseEvent, node: Node) => {
          e.preventDefault();
          e.stopPropagation();
          if (editingNodeId !== node.id) startEditing(node.id);
        }}
  onConnect={onConnect}
  onConnectStart={onConnectStart}
  onConnectEnd={onConnectEnd}
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
