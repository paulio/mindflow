import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import ReactFlow, { Background, Controls, NodeProps, Node, OnNodesChange, Connection, Handle, Position, OnConnectStart, OnConnectEnd, useReactFlow, applyNodeChanges, MarkerType } from 'reactflow';
import { ThoughtEdge } from './ThoughtEdge';
import { ReferenceEdge } from './ReferenceEdge';
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
// Derive a focus ring (box-shadow) using the node's current border colour.
// Converts #RRGGBB or #RRGGBBAA to rgba with a consistent alpha (0.35 by default) so it mimics the
// previous --mf-selection-outline token while reflecting the override colour.
function buildFocusRing(colour: string, alpha: number = 0.35, px: number = 3) {
  if (!colour || typeof colour !== 'string') return 'none';
  let hex = colour.trim();
  if (!hex.startsWith('#')) return 'none';
  hex = hex.slice(1);
  if (!(hex.length === 6 || hex.length === 8)) return 'none';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // If original provided an alpha (length 8) we blend with desired ring alpha (multiply) for subtlety
  let a = alpha;
  if (hex.length === 8) {
    const origA = parseInt(hex.slice(6, 8), 16) / 255;
    a = +(origA * alpha).toFixed(3);
  }
  return `0 0 0 ${px}px rgba(${r},${g},${b},${a})`;
}

const ThoughtNodeWrapper: React.FC<NodeProps> = (props) => {
  const { id, data, selected } = props as any;
  const raw = data?.raw;
  const borderColour: string = raw?.currentBorderColour || raw?.originalBorderColour || 'var(--mf-node-border)';
  const ring = selected ? buildFocusRing(borderColour) : 'none';
  const sourceOffset = -14;
  const targetOffset = DEBUG_NODES ? -30 : -14;
  const hideSource = !!data?.hideSource;
  const hideTarget = !!data?.hideTarget;
  const hiddenStyle: React.CSSProperties = { display: 'none' };
  return (
    <div
      style={{
        position: 'relative',
        border: `${selected ? 'var(--mf-node-border-width-selected)' : 'var(--mf-node-border-width)'} solid ${borderColour}`,
        borderRadius: 6,
        boxShadow: ring,
        transition: 'box-shadow 80ms var(--ease-standard), border-color 80ms var(--ease-standard)'
      }}
    >
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

// Stable top-level node/edge type maps (avoid recreation warnings from React Flow)
const NodeTypesConst = {
  thought: ThoughtNodeWrapper,
  note: (props: any) => { const { id, data, selected } = props; return <NoteNode id={id} text={data.label} selected={!!selected} />; },
  rect: (props: any) => { const { id, selected } = props; return <RectNode id={id} selected={!!selected} />; }
};
const EdgeTypesConst = {
  'thought-edge': ThoughtEdge,
  'reference-edge': ReferenceEdge
};

// Reference connection arrow marker size (halved from previous 18)
const REFERENCE_MARKER_SIZE = 9;

export const GraphCanvas: React.FC = () => {
  const { nodes, edges, references, selectedReferenceId, selectReference, deleteReference, startEditing, editingNodeId, moveNode, addEdge, addConnectedNode, graph, updateViewport, selectNode, activeTool, addAnnotation, updateEdgeHandles, createReference, repositionReference, selectedNodeIds, replaceSelection, addToSelection, marquee, beginMarquee, updateMarquee, endMarquee, cancelMarquee, activateMarquee, interactionMode } = useGraph() as any;
  // Local React Flow controlled nodes (decoupled from store during drag for stability)
  const [flowNodes, setFlowNodes] = useState<any[]>([]);
  // Version bump to coerce ReactFlow rerender when selection changes programmatically
  const [selectionVersion, setSelectionVersion] = useState(0);
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
        const isSelected = selectedNodeIds.includes(n.id);
        if (byId.has(n.id)) {
          const existing = byId.get(n.id)!;
          return {
            ...existing,
            position: { x: n.x, y: n.y },
            style: { ...(existing.style || {}), ...sizeStyle, zIndex },
            data: { label: n.text || 'New Thought', raw: n, ...commonData },
            type: baseType,
            selected: isSelected
          };
        }
        return {
          id: n.id,
          type: baseType,
            position: { x: n.x, y: n.y },
          style: { ...sizeStyle, zIndex },
          data: { label: n.text || (baseType === 'note' ? 'Note' : 'New Thought'), raw: n, ...commonData },
          tabIndex: 0,
          selected: isSelected
        };
      });
    });
  }, [nodes, activeDragType, selectedNodeIds]);
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
  const rfEdges = useMemo(() => {
    const thoughtEdges = edges.map((e: any) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      sourceHandle: e.sourceHandleId,
      targetHandle: e.targetHandleId,
      type: 'thought-edge',
      data: {},
      selectable: true,
      selected: false
    }));
    const refEdges = references.map((r: any) => {
      const styleValue = r.style || 'single';
      // Visual issue: React Flow currently renders our former markerEnd at the perceived source side.
      // To place arrow at logical target, we invert: use markerStart for single-arrow, both for double.
      const arrowAtTarget = styleValue === 'single' || styleValue === 'double';
      const arrowAtSource = styleValue === 'double';
      const isSelected = selectedReferenceId === r.id;
      return {
        id: r.id,
        source: r.sourceNodeId,
        target: r.targetNodeId,
        sourceHandle: r.sourceHandleId,
        targetHandle: r.targetHandleId,
        type: 'reference-edge',
        data: { ref: true, style: styleValue, labelHidden: r.labelHidden, label: r.label },
        markerStart: arrowAtTarget ? { type: MarkerType.ArrowClosed, color: isSelected ? '#ff0' : '#888', width: REFERENCE_MARKER_SIZE, height: REFERENCE_MARKER_SIZE } : undefined,
        markerEnd: arrowAtSource ? { type: MarkerType.ArrowClosed, color: isSelected ? '#ff0' : '#888', width: REFERENCE_MARKER_SIZE, height: REFERENCE_MARKER_SIZE } : undefined,
        style: { stroke: isSelected ? '#ff0' : '#888', strokeWidth: isSelected ? 3 : 2, cursor: 'pointer' },
        selectable: true,
        selected: isSelected
      };
    });
    return [...thoughtEdges, ...refEdges];
  }, [edges, references, selectedReferenceId]);
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
    if (oldEdge.data?.ref) {
      // Reposition reference endpoints
      if (!newConnection.source || !newConnection.target) return;
      repositionReference(oldEdge.id, newConnection.source, newConnection.target, newConnection.sourceHandle, newConnection.targetHandle);
    } else {
      updateEdgeHandles(oldEdge.id, newConnection.sourceHandle, newConnection.targetHandle);
    }
  };
  const onNodesChange: OnNodesChange = (changes) => {
    setFlowNodes(ns => applyNodeChanges(changes, ns));
  };
  // Persist final position after drag (support multi-select group drag)
  const onNodeDragStop = (_: React.MouseEvent, node: Node) => {
    if (selectedNodeIds && selectedNodeIds.length > 1) {
      // ReactFlow already applied final positions to all selected nodes in local state (flowNodes)
      // Persist each selected node's current position.
      const posById: Record<string, { x: number; y: number }> = {};
      for (const fn of flowNodes) {
        if (selectedNodeIds.includes(fn.id)) {
          posById[fn.id] = { x: fn.position.x, y: fn.position.y };
        }
      }
      // Write positions; avoid duplicate calls if dragged node also in set.
      Object.entries(posById).forEach(([id, p]) => {
        moveNode(id, p.x, p.y);
      });
      // eslint-disable-next-line no-console
      console.log('[multi-drag][persist]', Object.keys(posById));
    } else {
      moveNode(node.id, node.position.x, node.position.y);
    }
  };
  // We no longer custom-handle edge selection
  const onEdgesChange = undefined;
  // Add edge when both ends valid
  const onConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      // Create a reference connection instead of a structural thought edge
      createReference(connection.source, connection.target, 'single', connection.sourceHandle ?? undefined, connection.targetHandle ?? undefined);
      // eslint-disable-next-line no-console
      console.log('[createReference]', { source: connection.source, target: connection.target });
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
  // Remove useMemo for nodeTypes/edgeTypes; use stable top-level constants instead
  const nodeTypes = NodeTypesConst as any;
  const edgeTypes = EdgeTypesConst as any;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedReferenceId) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      // If focus is inside a text-editing context, don't treat Delete as a graph command.
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        const editable = active.getAttribute('contenteditable');
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (editable && editable !== 'false')) {
          return; // allow normal deletion within the field
        }
      }
      e.preventDefault();
      deleteReference(selectedReferenceId);
      selectReference(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReferenceId, deleteReference, selectReference]);
  // ===== Marquee Selection Logic =====
  const paneRef = useRef<HTMLDivElement | null>(null);
  const MARQUEE_THRESHOLD = 8; // px in screen space
  const [isPointerDown, setIsPointerDown] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; additive: boolean } | null>(null);

  const screenToFlow = useCallback((pt: { x: number; y: number }) => rfInstance.screenToFlowPosition(pt), [rfInstance]);
  const flowToScreen = useCallback((pt: { x: number; y: number }) => {
    const vp = rfInstance.getViewport();
    // React Flow transform: screen = flow * zoom + translate
    return { x: pt.x * vp.zoom + vp.x, y: pt.y * vp.zoom + vp.y };
  }, [rfInstance]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
  if (interactionMode !== 'select') return; // only in selection mode
  if (!(e.target as HTMLElement).classList.contains('react-flow__pane')) return;
    // Don't start if a tool action is active (will create annotation) or editing text
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) return;
    const additive = e.shiftKey;
    dragOrigin.current = { x: e.clientX, y: e.clientY, additive };
    const flow = screenToFlow({ x: e.clientX, y: e.clientY });
    beginMarquee(flow.x, flow.y, additive);
    setIsPointerDown(true);
  }, [beginMarquee, screenToFlow]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
  if (interactionMode !== 'select') return;
  if (!isPointerDown || !dragOrigin.current) return;
    const origin = dragOrigin.current;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    const flow = screenToFlow({ x: e.clientX, y: e.clientY });
    updateMarquee(flow.x, flow.y);
    // Promote to active if threshold exceeded
    if (dist >= MARQUEE_THRESHOLD && marquee && marquee.active === false) {
      activateMarquee();
    }
  }, [isPointerDown, updateMarquee, screenToFlow, marquee, activateMarquee]);

  const finalizeSelection = useCallback((bounds: { startX: number; startY: number; endX: number; endY: number }, additive: boolean) => {
    // Compute bounding box and gather hit node ids
    const minX = Math.min(bounds.startX, bounds.endX);
    const maxX = Math.max(bounds.startX, bounds.endX);
    const minY = Math.min(bounds.startY, bounds.endY);
    const maxY = Math.max(bounds.startY, bounds.endY);
    const hits: string[] = [];
    for (const n of nodes) {
      const rendered = flowNodes.find(fn => fn.id === n.id);
      const w = rendered?.style?.width || (n.nodeKind === 'rect' ? (n.width || 120) : (n.nodeKind === 'note' ? (n.width || 140) : 100));
      const h = rendered?.style?.height || (n.nodeKind === 'rect' ? (n.height || 60) : (n.nodeKind === 'note' ? (n.height || 90) : 38));
      const nx1 = n.x; const ny1 = n.y; const nx2 = nx1 + w; const ny2 = ny1 + h;
      const overlap = nx1 <= maxX && nx2 >= minX && ny1 <= maxY && ny2 >= minY; // any overlap counts
      if (overlap) hits.push(n.id);
    }
    // Update global selection state first
    if (additive) {
      addToSelection(hits);
    } else {
      replaceSelection(hits);
    }
    // Immediately reflect selection visually in local ReactFlow node state
    // (avoids a single-frame delay waiting for effect to rebuild flowNodes)
    const projectedSelection = (() => {
      if (additive) {
        const set = new Set<string>([...selectedNodeIds, ...hits]);
        return set;
      }
      return new Set<string>(hits);
    })();
    setFlowNodes(cur => cur.map(fn => {
      const shouldBeSelected = projectedSelection.has(fn.id);
      if (shouldBeSelected === !!fn.selected) return fn; // no change
      return { ...fn, selected: shouldBeSelected };
    }));
    // Force ReactFlow to refresh if visual state lags by remounting (acceptable for now; can optimize later)
    setSelectionVersion(v => v + 1);
    // Diagnostic logging: show detailed node state for marquee selection
    try {
      const selectedArray = Array.from(projectedSelection.values());
      // Build rows in a stable order (insertion order of projectedSelection)
      const nodeState = selectedArray.map((id, index) => {
        const fn = flowNodes.find(n => n.id === id);
        return {
          index,
          id,
          type: fn?.type ?? 'unknown',
          x: fn?.position?.x ?? NaN,
          y: fn?.position?.y ?? NaN,
          selected: true // by definition of projectedSelection
        };
      });
      // eslint-disable-next-line no-console
      console.groupCollapsed('[diag][marquee-selection]');
      // eslint-disable-next-line no-console
      console.log('additive?', additive);
      // eslint-disable-next-line no-console
      console.log('hits (this gesture):', hits);
      // eslint-disable-next-line no-console
      console.log('projected full selection:', selectedArray);
  // eslint-disable-next-line no-console
  console.table(nodeState, ['index','id','type','x','y','selected']);
  // Fallback / explicit rows (ensures visibility even if console.table collapses or is unsupported)
  // eslint-disable-next-line no-console
  console.log('[rows]', nodeState.map(r => `${r.index}\t${r.id}\t${r.type}\t(${r.x},${r.y})\tselected=${r.selected}`));
      // eslint-disable-next-line no-console
      console.groupEnd();
    } catch { /* ignore logging errors */ }
    return hits;
  }, [nodes, flowNodes, addToSelection, replaceSelection, selectedNodeIds]);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
  if (interactionMode !== 'select') return;
  if (!isPointerDown) return;
    setIsPointerDown(false);
    let result = endMarquee();
    // If marquee never activated (threshold not crossed) but pointer moved enough, synthesize one so we still capture.
    if (!result && marquee && marquee.active === false) {
      const dxMove = Math.abs(marquee.currentX - marquee.startX);
      const dyMove = Math.abs(marquee.currentY - marquee.startY);
      const maxDim = Math.max(dxMove, dyMove);
      if (maxDim >= MARQUEE_THRESHOLD) {
        result = { startX: marquee.startX, startY: marquee.startY, endX: marquee.currentX, endY: marquee.currentY, additive: marquee.additive };
      }
    }
    if (!result) { dragOrigin.current = null; return; }
    const dx = Math.abs(result.endX - result.startX);
    const dy = Math.abs(result.endY - result.startY);
    if (Math.max(dx, dy) < MARQUEE_THRESHOLD) { dragOrigin.current = null; return; }
    const hits = finalizeSelection(result, !!result.additive);
    if (hits.length) {
      // eslint-disable-next-line no-console
      console.log('[marquee] captured nodes:', hits);
    } else {
      // eslint-disable-next-line no-console
      console.log('[marquee] none captured');
    }
    dragOrigin.current = null;
  }, [isPointerDown, endMarquee, finalizeSelection]);

  useEffect(() => {
    const pane = paneRef.current?.querySelector('.react-flow__pane');
    if (!pane) return;
    const handlePointerDown = (e: PointerEvent) => onPointerDown(e as any);
    const handlePointerMove = (e: PointerEvent) => onPointerMove(e as any);
    const handlePointerUp = (e: PointerEvent) => onPointerUp(e as any);
  (pane as any).addEventListener('pointerdown', handlePointerDown as any);
  (window as any).addEventListener('pointermove', handlePointerMove as any);
  (window as any).addEventListener('pointerup', handlePointerUp as any);
    return () => {
      (pane as any).removeEventListener('pointerdown', handlePointerDown as any);
      (window as any).removeEventListener('pointermove', handlePointerMove as any);
      (window as any).removeEventListener('pointerup', handlePointerUp as any);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  // Marquee rectangle(s): show faint pre-threshold preview, solid after activation
  let marqueeRect: { x: number; y: number; w: number; h: number; pre: boolean } | null = null;
  if (interactionMode === 'select' && marquee) {
    const minX = Math.min(marquee.startX, marquee.currentX);
    const minY = Math.min(marquee.startY, marquee.currentY);
    const wFlow = Math.abs(marquee.currentX - marquee.startX);
    const hFlow = Math.abs(marquee.currentY - marquee.startY);
    const tl = flowToScreen({ x: minX, y: minY });
    const br = flowToScreen({ x: minX + wFlow, y: minY + hFlow });
    const w = br.x - tl.x;
    const h = br.y - tl.y;
    const maxDim = Math.max(Math.abs(w), Math.abs(h));
    if (maxDim >= 2) { // avoid zero flicker
      const active = marquee.active && maxDim >= MARQUEE_THRESHOLD;
      marqueeRect = { x: tl.x, y: tl.y, w: Math.abs(w), h: Math.abs(h), pre: !active };
    }
  }

  // ===== Group Selection Bounding Box (Option A) =====
  // Render a unified bounding rectangle when multiple nodes are selected (and no active marquee in progress).
  // Purely visual; future enhancements (resize/group drag handles) can hook into this container.
  let groupRect: { x: number; y: number; w: number; h: number } | null = null;
  if (!marqueeRect && selectedNodeIds && selectedNodeIds.length > 1) {
    // Gather rendered flow nodes for selected ids to obtain current widths/heights.
    const selectedFlowNodes = flowNodes.filter(n => selectedNodeIds.includes(n.id));
    if (selectedFlowNodes.length > 1) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const fn of selectedFlowNodes) {
        const baseW = (fn.style && (fn.style as any).width) || (fn.type === 'rect' ? (fn.data?.raw?.width || RECT_W) : (fn.type === 'note' ? (fn.data?.raw?.width || NOTE_W) : THOUGHT_W));
        const baseH = (fn.style && (fn.style as any).height) || (fn.type === 'rect' ? (fn.data?.raw?.height || RECT_H) : (fn.type === 'note' ? (fn.data?.raw?.height || NOTE_H) : THOUGHT_H));
        const x1 = fn.position.x;
        const y1 = fn.position.y;
        const x2 = x1 + baseW;
        const y2 = y1 + baseH;
        if (x1 < minX) minX = x1;
        if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
      }
      if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
        const tl = flowToScreen({ x: minX, y: minY });
        const br = flowToScreen({ x: maxX, y: maxY });
        groupRect = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
      }
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative' }} ref={paneRef}>
  <ReactFlow
  key={selectionVersion}
  nodes={rfNodes}
  edges={rfEdges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
        fitView
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodeDragStop={onNodeDragStop}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
  panOnScroll={interactionMode === 'grab'}
  panOnDrag={interactionMode === 'grab'}
  onNodeClick={(e, node) => {
          // Basic multi-select: Shift+Click adds to existing selection; no marquee involvement.
          const isShift = (e as any).shiftKey;
          if (isShift) {
            addToSelection([node.id]);
          } else {
            replaceSelection([node.id]);
          }
          // Compute projected selection for diagnostics (since global state update batches)
          try {
            const projected = new Set<string>(isShift ? [...selectedNodeIds, node.id] : [node.id]);
            const selectedArray = Array.from(projected.values());
            const nodeState = selectedArray.map((id, index) => {
              const fn = rfNodes.find(n => n.id === id);
              return {
                index,
                id,
                type: fn?.type ?? 'unknown',
                x: fn?.position?.x ?? NaN,
                y: fn?.position?.y ?? NaN,
                selected: true
              };
            });
            // eslint-disable-next-line no-console
            console.groupCollapsed('[diag][click-selection]' + (isShift ? '[shift+click]' : '[click]'));
            // eslint-disable-next-line no-console
            console.log('clicked node id:', node.id);
            // eslint-disable-next-line no-console
            console.log('projected selection ids:', selectedArray);
            // eslint-disable-next-line no-console
            console.table(nodeState, ['index','id','type','x','y','selected']);
            // eslint-disable-next-line no-console
            console.log('[rows]', nodeState.map(r => `${r.index}\t${r.id}\t${r.type}\t(${r.x},${r.y})\tselected=${r.selected}`));
            // eslint-disable-next-line no-console
            console.groupEnd();
          } catch { /* ignore logging errors */ }
        }}
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
  onEdgeClick={(e, edge) => {
          const isReference = edge.data && (edge.data as any).ref;
          // eslint-disable-next-line no-console
          console.log('[EdgeClick]', { edgeId: edge.id, rfType: edge.type, reference: isReference });
          if (isReference) {
            e.stopPropagation();
            selectReference(edge.id);
          } else {
            selectReference(null);
          }
        }}
  edgesUpdatable
        nodesDraggable
        nodesConnectable={true}
        elementsSelectable
        connectOnClick={false}
        onPaneClick={(e) => {
          const target = e.target as HTMLElement;
          if (target && target.classList.contains('react-flow__pane')) {
            selectReference(null);
            selectNode(null);
          }
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
  style={{ background: '#0d0f17', touchAction: 'none' }}
        onMoveEnd={(_, viewport) => { updateViewport(viewport.x, viewport.y, viewport.zoom); }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {groupRect && (
        <div
          aria-label={selectedNodeIds.length + ' nodes selected'}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${groupRect.x}px, ${groupRect.y}px)`,
            width: groupRect.w,
            height: groupRect.h,
            background: 'rgba(79,157,255,0.04)', // subtle unified tint
            outline: '1px dashed rgba(79,157,255,0.7)',
            borderRadius: 8,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.35), 0 0 0 3px rgba(79,157,255,0.15)',
            pointerEvents: 'none',
            zIndex: 40,
            transition: 'opacity 120ms var(--ease-standard)',
            opacity: 1
          }}
        />
      )}
      {marqueeRect && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${marqueeRect.x}px, ${marqueeRect.y}px)`,
            width: marqueeRect.w,
            height: marqueeRect.h,
            background: marqueeRect.pre ? 'rgba(255,255,0,0.03)' : 'rgba(255,255,0,0.10)',
            outline: marqueeRect.pre ? '1px dashed rgba(255,255,0,0.35)' : '1px solid #ff0',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: marqueeRect.pre ? 'none' : '0 0 0 1px rgba(0,0,0,0.4)'
          }}
        />
      )}
    </div>
  );
};
// Restore viewport when graph (map) changes
// We place the effect after component body definition to access rfInstance via hook (so we convert to inline effect above) - but rfInstance is inside component earlier; add effect there.

