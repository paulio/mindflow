import React, { useMemo, useRef, useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, NodeProps, Node, OnNodesChange, Connection, Handle, Position, OnConnectStart, OnConnectEnd, useReactFlow, applyNodeChanges } from 'reactflow';
import { ThoughtEdge } from './ThoughtEdge';
import { useGraph } from '../../state/graph-store';
import { isPlacementValid } from '../../lib/distance';
import { NOTE_W, NOTE_H, RECT_W, RECT_H, THOUGHT_W, THOUGHT_H } from '../../lib/annotation-constants';
// (creation helpers imported earlier are currently unused; keeping file lean)
import 'reactflow/dist/style.css';
import { ThoughtNode } from '../nodes/ThoughtNode';
import { RectNode } from '../nodes/RectNode';
import { NoteNode } from '../nodes/NoteNode';
// Custom directional ghost/drag handles removed in favor of native React Flow connection UX.

// Debug flag: when true, we visibly separate target handles from source handles so they don't overlap.
// Set to false for normal UI; currently true per request to visualize distinct handle layers.
const DEBUG_NODES = false; // toggle to false for production / standard appearance

const handleStyle: React.CSSProperties = {
  width: 'var(--mf-handle-size)',
  height: 'var(--mf-handle-size)',
  border: 'var(--mf-handle-border-width) solid #0d0f17',
  background: 'var(--mf-handle-target)',
  zIndex: 1
};
// Thought node wrapper accepts flags (via data) to hide source or target handles while dragging
const ThoughtNodeWrapper: React.FC<NodeProps> = (props) => {
  const { id, data, selected } = props as any;
  const sourceOffset = -14;
  const targetOffset = DEBUG_NODES ? -30 : -14;
  const hideSource = !!data?.hideSource;
  const hideTarget = !!data?.hideTarget;
  const hiddenStyle: React.CSSProperties = { display: 'none' };
  return (
    <div style={{ position: 'relative' }}>
      <ThoughtNode id={id} text={data?.label} selected={!!selected} />
      {/* Source handles */}
  <Handle type="source" id="n" position={Position.Top} style={hideSource ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-source)', top: sourceOffset }} />
  <Handle type="source" id="e" position={Position.Right} style={hideSource ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-source)', right: sourceOffset }} />
  <Handle type="source" id="s" position={Position.Bottom} style={hideSource ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-source)', bottom: sourceOffset }} />
  <Handle type="source" id="w" position={Position.Left} style={hideSource ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-source)', left: sourceOffset }} />
      {/* Target handles */}
  <Handle type="target" id="n" position={Position.Top} style={hideTarget ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-target)', top: targetOffset }} />
  <Handle type="target" id="e" position={Position.Right} style={hideTarget ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-target)', right: targetOffset }} />
  <Handle type="target" id="s" position={Position.Bottom} style={hideTarget ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-target)', bottom: targetOffset }} />
  <Handle type="target" id="w" position={Position.Left} style={hideTarget ? hiddenStyle : { ...handleStyle, background: 'var(--mf-handle-target)', left: targetOffset }} />
    </div>
  );
};

export const GraphCanvas: React.FC = () => {
  const { nodes, edges, startEditing, editingNodeId, moveNode, addEdge, addConnectedNode, graph, updateViewport, selectNode, activeTool, addAnnotation, updateEdgeHandles } = useGraph() as any;
  // Local React Flow controlled nodes (decoupled from store during drag for stability)
  const [flowNodes, setFlowNodes] = useState<any[]>([]);
  // Track handle drag type so we can hide the opposite type while dragging to prevent overlap confusion
  const [activeDragType, setActiveDragType] = useState<'source' | 'target' | null>(null);
  // Initialize / merge store nodes into local state (add new, update labels). Positions updated when not currently dragging.
  useEffect(() => {
    setFlowNodes(cur => {
      const byId = new Map(cur.map(n => [n.id, n]));
      return nodes.map((n: any) => {
        const isAnnotation = n.nodeKind === 'note' || n.nodeKind === 'rect';
        const front = n.frontFlag !== false;
        const zIndex = isAnnotation ? (front ? 15 : -1) : 10;
        const baseType = n.nodeKind && n.nodeKind !== 'thought' ? n.nodeKind : 'thought';
        const sizeStyle = (n.nodeKind === 'rect')
          ? { width: n.width || RECT_W, height: n.height || RECT_H }
          : (n.nodeKind === 'note' ? { width: n.width || NOTE_W, height: n.height || NOTE_H } : {});
  // Updated logic (user clarification):
  // When dragging a TARGET endpoint, we want only SOURCE ports available -> hideTarget true in that case.
  // When dragging a SOURCE endpoint, we want only TARGET ports available -> hideSource true in that case.
  const commonData = { hideSource: activeDragType === 'source', hideTarget: activeDragType === 'target' };
        if (byId.has(n.id)) {
          const existing = byId.get(n.id)!;
          return {
            ...existing,
            position: { x: n.x, y: n.y },
            style: { ...(existing.style || {}), ...sizeStyle, zIndex },
            data: { label: n.text || 'New Thought', raw: n, ...commonData },
            type: baseType
          };
        }
        return {
          id: n.id,
          type: baseType,
            position: { x: n.x, y: n.y },
          style: { ...sizeStyle, zIndex },
          data: { label: n.text || (baseType === 'note' ? 'Note' : 'New Thought'), raw: n, ...commonData },
          tabIndex: 0
        };
      });
    });
  }, [nodes, activeDragType]);
  const rfInstance = useReactFlow();
  useEffect(() => {
    if (graph?.viewport) {
      const { x, y, zoom } = graph.viewport;
      try { rfInstance.setViewport({ x, y, zoom }, { duration: 0 }); } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph?.id]);
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
      updatable: true
    })),
    [edges]
  );
  // Native edge update only (fallback logic removed)
  // When updating an existing edge endpoint, hide opposite handles
  const onEdgeUpdateStart = (_: any, __: any, handleType: 'source' | 'target') => {
    if (handleType) {
      // eslint-disable-next-line no-console
      console.log('[connector drag start][update]', handleType);
      setActiveDragType(handleType);
    }
  };
  const onEdgeUpdateEnd = () => { setActiveDragType(null); };
  const onEdgeUpdate = (oldEdge: any, newConnection: any) => {
    if (!oldEdge) return;
    updateEdgeHandles(oldEdge.id, newConnection.sourceHandle, newConnection.targetHandle);
  };
  const onNodesChange: OnNodesChange = (changes) => {
    setFlowNodes(ns => applyNodeChanges(changes, ns));
  };
  // Persist final position after drag
  const onNodeDragStop = (_: React.MouseEvent, node: Node) => {
    moveNode(node.id, node.position.x, node.position.y);
  };
  // We no longer custom-handle edge selection
  const onEdgesChange = undefined;
  // Add edge when both ends valid
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
    if (params.handleType === 'source' || params.handleType === 'target') {
      // eslint-disable-next-line no-console
      console.log('[connector drag start][new]', params.handleType);
      setActiveDragType(params.handleType as 'source' | 'target');
    }
  };

  const onConnectEnd: OnConnectEnd = (evt) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start) { setActiveDragType(null); return; }
    setActiveDragType(null);
    const target = evt.target as HTMLElement | null;
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
      if (dist < DRAG_THRESHOLD) return;
      const NEW_W = 100; const NEW_H = 38;
      const opposite: Record<string, string> = { n: 's', s: 'n', e: 'w', w: 'e' };
      const sourceHandleId = start.handleId;
      const targetHandleId = sourceHandleId ? opposite[sourceHandleId] : undefined;
      const newNode = addConnectedNode(start.nodeId, endGraph.x - NEW_W / 2, endGraph.y - NEW_H / 2, sourceHandleId, targetHandleId);
      if (newNode) startEditing(newNode.id);
    }
  };
  // Dev aid: log whenever edge count changes (can remove later)
  // Optional dev log removed for cleaner standard behavior
  const RectWrapper: React.FC<NodeProps> = (props) => {
    const { id, selected } = props as any;
    return <RectNode id={id} selected={!!selected} />;
  };
  const NoteWrapper: React.FC<NodeProps> = (props) => {
    const { id, data, selected } = props as any;
    return <NoteNode id={id} text={data.label} selected={!!selected} />;
  };
  const nodeTypes = useMemo(() => ({ thought: ThoughtNodeWrapper, note: NoteWrapper, rect: RectWrapper }), []);
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
  onNodeClick={(_, node) => { selectNode(node.id); }}
        onNodeDoubleClick={(e: React.MouseEvent, node: Node) => {
          e.preventDefault();
          e.stopPropagation();
          selectNode(node.id);
          if (editingNodeId !== node.id && (node.type === 'thought' || node.type === 'note')) startEditing(node.id);
        }}
  onConnect={onConnect}
  onConnectStart={onConnectStart}
  onConnectEnd={onConnectEnd}
  onEdgeUpdateStart={onEdgeUpdateStart}
  onEdgeUpdateEnd={onEdgeUpdateEnd}
  onEdgeUpdate={onEdgeUpdate}
  edgesUpdatable
        nodesDraggable
        nodesConnectable={true}
        elementsSelectable
        connectOnClick={false}
        onPaneClick={(e) => {
          if (!graph) return;
          if (!activeTool) return; // FR-024
          const point = rfInstance.screenToFlowPosition({ x: (e as any).clientX, y: (e as any).clientY });
          const w = activeTool === 'note' ? NOTE_W : RECT_W;
          const h = activeTool === 'note' ? NOTE_H : RECT_H;
          const candidate = { x: point.x - w / 2, y: point.y - h / 2, w, h };
          // Build existing boxes - approximate thought size; annotation sizes unknown yet so treat existing annotation nodes similarly for now.
          const existing = nodes.map((n: any) => ({
            x: n.x,
            y: n.y,
            w: n.nodeKind === 'rect' ? (n.width || RECT_W) : (n.nodeKind === 'note' ? NOTE_W : THOUGHT_W),
            h: n.nodeKind === 'rect' ? (n.height || RECT_H) : (n.nodeKind === 'note' ? NOTE_H : THOUGHT_H)
          }));
          if (!isPlacementValid(candidate as any, existing as any)) {
            return; // FR-023 rejection
          }
          const created = addAnnotation(activeTool, candidate.x, candidate.y) as any;
          if (activeTool === 'note' && created) {
            requestAnimationFrame(() => startEditing(created.id));
          }
        }}
  defaultEdgeOptions={{ type: 'thought-edge', updatable: true }}
  edgeUpdaterRadius={28}
  style={{ background: '#0d0f17' }}
        onMoveEnd={(_, viewport) => { updateViewport(viewport.x, viewport.y, viewport.zoom); }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
// Restore viewport when graph (map) changes
// We place the effect after component body definition to access rfInstance via hook (so we convert to inline effect above) - but rfInstance is inside component earlier; add effect there.

