import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createGraph, loadGraph, saveNodes, saveEdges, deleteGraph, updateGraphMeta, listGraphs, cloneGraph, persistNodeDeletion } from '../lib/indexeddb';
import { createNode, createEdge } from '../lib/graph-domain';
import { NodeRecord, EdgeRecord, GraphRecord } from '../lib/types';
import { events } from '../lib/events';
import { pushUndo, resetUndoHistory } from '../hooks/useUndoRedo';

type ViewMode = 'library' | 'canvas';
interface GraphState { graph: GraphRecord | null; nodes: NodeRecord[]; edges: EdgeRecord[]; graphs: GraphRecord[]; view: ViewMode; }

interface GraphContext extends GraphState {
  newGraph(): Promise<void>;
  selectGraph(id: string): Promise<void>;
  openLibrary(): void;
  renameGraph(name: string): Promise<void>;
  removeGraph(id: string): Promise<void>;
  addNode(x: number, y: number): NodeRecord | null;
  addEdge(source: string, target: string, sourceHandleId?: string, targetHandleId?: string): void;
  addConnectedNode(sourceNodeId: string, x: number, y: number, sourceHandleId?: string, targetHandleId?: string): NodeRecord | null; // atomic node+edge with directional handle metadata
  updateNodeText(nodeId: string, text: string): void;
  updateNodeColors(nodeId: string, bgColor?: string, textColor?: string): void;
  updateNodeZOrder(nodeId: string, front: boolean): void;
  updateNoteAlignment(nodeId: string, h?: 'left' | 'center' | 'right', v?: 'top' | 'middle' | 'bottom'): void;
  moveNode(nodeId: string, x: number, y: number): void;
  updateViewport(x: number, y: number, zoom: number): void;
  // Ephemeral position update during drag (no persistence, no lastModified update)
  setNodePositionEphemeral(nodeId: string, x: number, y: number): void;
  deleteNode(nodeId: string): void; // FR-043 deletion with re-parenting
  cloneCurrent(): Promise<void>; // FR-046 clone map
  // Centralized edit focus management so ReactFlow re-renders do not lose edit mode when selection changes.
  editingNodeId: string | null;
  startEditing(nodeId: string): void;
  stopEditing(): void;
  pendingChanges: boolean; // coarse indicator for unsaved changes (future: integrate with autosave scheduler)
  selectedNodeId: string | null;
  selectNode(id: string | null): void;
  levels: Map<string, number>;
  // Toolbar feature state
  activeTool: 'note' | 'rect' | null;
  activateTool(tool: 'note' | 'rect'): void;
  toggleTool(tool: 'note' | 'rect'): void;
  addAnnotation(kind: 'note' | 'rect', x: number, y: number): void;
  resizeRectangle(nodeId: string, width: number, height: number, gesture?: { prevWidth: number; prevHeight: number; prevX: number; prevY: number; newX?: number; newY?: number }): void;
  resizeRectangleEphemeral(nodeId: string, width: number, height: number, x: number, y: number): void;
  updateEdgeHandles(edgeId: string, sourceHandleId?: string | null, targetHandleId?: string | null): void;
  // Rich note formatting updates
  updateNoteFormatting(nodeId: string, patch: Partial<Pick<NodeRecord,'fontFamily'|'fontSize'|'fontWeight'|'italic'|'underline'|'highlight'|'backgroundOpacity'|'overflowMode'|'hideShapeWhenUnselected'|'maxHeight'>>): void;
  resetNoteFormatting(nodeId: string): void;
}

const Ctx = createContext<GraphContext | null>(null);

export const GraphProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [graph, setGraph] = useState<GraphRecord | null>(null);
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [edges, setEdges] = useState<EdgeRecord[]>([]);
  const [graphs, setGraphs] = useState<GraphRecord[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('library');
  const [pendingChanges, setPendingChanges] = useState<boolean>(false); // placeholder (would toggle on edits & clear on autosave success)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Map<string, number>>(new Map());
  const [activeTool, setActiveTool] = useState<'note' | 'rect' | null>(null);
  const mutationCounter = useRef(0);

  async function refreshList() { setGraphs(await listGraphs()); }

  const newGraph = useCallback(async () => {
    const g = await createGraph('Untitled Map');
    resetUndoHistory(); // Clear any prior history (FR-021 / session boundary)
    setGraph(g);
    // Create an initial root node so every new graph starts non-empty per requirement.
    const root = createNode({ graphId: g.id, x: 0, y: 0, text: 'New Thought' });
    setNodes([root]);
    setEdges([]);
  mutationCounter.current++;
    events.emit('graph:created', { graphId: g.id });
    events.emit('node:created', { graphId: g.id, nodeId: root.id });
  void saveNodes(g.id, [root]);
    await refreshList();
    setView('canvas');
  }, []);

  const selectGraph = useCallback(async (id: string) => {
    const snap = await loadGraph(id);
    if (snap) {
      resetUndoHistory(); // Always clear history even if reloading same graph
      setGraph(snap.graph);
      setNodes(snap.nodes);
      setEdges(snap.edges);
  mutationCounter.current++;
      events.emit('graph:loaded', { graphId: snap.graph.id });
      setView('canvas');
      setSelectedNodeId(null);
    }
  }, []);

  const openLibrary = useCallback(() => {
    // Guard: if editing in progress warn
    if (editingNodeId) {
      const proceed = window.confirm('You have an edit in progress. Leave and discard focus?');
      if (!proceed) return;
      setEditingNodeId(null);
    }
    setView('library');
  }, [editingNodeId]);

  const renameGraph = useCallback(async (name: string) => {
    if (!graph) return;
    await updateGraphMeta(graph.id, { name });
    setGraph({ ...graph, name, lastModified: new Date().toISOString() });
    events.emit('graph:renamed', { graphId: graph.id, name });
    await refreshList();
  }, [graph]);

  const removeGraph = useCallback( async (id: string) => {
    await deleteGraph(id);
    if (graph?.id === id) { setGraph(null); setNodes([]); setEdges([]); }
    await refreshList();
  }, [graph]);

  const addNode = useCallback((x: number, y: number) : NodeRecord | null => {
    if (!graph) return null;
    const n = createNode({ graphId: graph.id, x, y });
    setNodes(ns => [...ns, n]);
  mutationCounter.current++;
    events.emit('node:created', { graphId: graph.id, nodeId: n.id });
    void saveNodes(graph.id, [n]);
    // Push undo entry (simple creation without edge)
    const snapshot = { ...n } as NodeRecord;
    pushUndo({
      type: 'create',
      undo: () => {
        setNodes(ns => ns.filter(nn => nn.id !== snapshot.id));
        void persistNodeDeletion(graph.id!, snapshot.id, [], []); // treat as deletion with no edges
        setEditingNodeId(id => id === snapshot.id ? null : id);
        events.emit('node:deleted', { graphId: graph.id!, nodeId: snapshot.id });
      },
      redo: () => {
        setNodes(ns => ns.some(nn => nn.id === snapshot.id) ? ns : [...ns, snapshot]);
        void saveNodes(graph.id!, [snapshot]);
        events.emit('node:created', { graphId: graph.id!, nodeId: snapshot.id });
      }
    });
    return n;
  }, [graph]);

  const addEdge = useCallback((source: string, target: string, sourceHandleId?: string, targetHandleId?: string) => {
    if (!graph) return;
    if (source === target) return; // no self edges
    // Prevent duplicate edge (same direction) creation
    let exists = false;
    setEdges(es => {
      if (es.some(edge => edge.sourceNodeId === source && edge.targetNodeId === target)) { exists = true; return es; }
      const e = createEdge({ graphId: graph.id, sourceNodeId: source, targetNodeId: target, sourceHandleId, targetHandleId });
      // Fire side-effects outside setState function to keep it pure-ish
      setTimeout(() => {
        events.emit('edge:created', { graphId: graph.id, edgeId: e.id });
        saveEdges(graph.id, [e]);
      }, 0);
      return [...es, e];
    });
    if (!exists) mutationCounter.current++;
    if (exists) return;
  }, [graph]);

  // Atomic creation: if edge creation fails, node is not persisted.
  const addConnectedNode = useCallback((sourceNodeId: string, x: number, y: number, sourceHandleId?: string, targetHandleId?: string): NodeRecord | null => {
    if (!graph) return null;
    let created: NodeRecord | null = null;
    try {
      // eslint-disable-next-line no-console
      console.debug('[graph-store] addConnectedNode invoked', { sourceNodeId, x, y, sourceHandleId, targetHandleId });
      created = createNode({ graphId: graph.id, x, y });
      const edge = createEdge({ graphId: graph.id, sourceNodeId, targetNodeId: created.id, sourceHandleId, targetHandleId });
      setNodes(ns => [...ns, created!]);
      setEdges(es => [...es, edge]);
  mutationCounter.current++;
      // Debug visibility: log creation so we can confirm in browser console.
      // eslint-disable-next-line no-console
      console.debug('[graph-store] addConnectedNode created node+edge', { node: created.id, edge: edge.id, sourceNodeId, targetNodeId: created.id });
      events.emit('node:created', { graphId: graph.id, nodeId: created.id });
      events.emit('edge:created', { graphId: graph.id, edgeId: edge.id });
      void saveNodes(graph.id, [created]);
      void saveEdges(graph.id, [edge]);
      setEditingNodeId(created.id); // Immediately focus new spawned node for editing (FR-004 + FR-005a synergy)

      // Push undo entry for atomic creation (FR-009 / FR-010)
      const nodeSnapshot = { ...created } as NodeRecord;
      const edgeSnapshot = { ...edge } as EdgeRecord;
      pushUndo({
        type: 'create',
        undo: () => {
          // Remove node & edge (if still present)
          setNodes(ns => ns.filter(n => n.id !== nodeSnapshot.id));
          setEdges(es => es.filter(e => e.id !== edgeSnapshot.id));
          // Persist deletion (treat as simple delete without re-parent edges)
          void persistNodeDeletion(graph.id!, nodeSnapshot.id, [edgeSnapshot.id], []);
          setEditingNodeId(id => id === nodeSnapshot.id ? null : id);
          events.emit('node:deleted', { graphId: graph.id!, nodeId: nodeSnapshot.id });
        },
        redo: () => {
          // Re-add node then edge (ordering matters for listeners)
          setNodes(ns => ns.some(n => n.id === nodeSnapshot.id) ? ns : [...ns, nodeSnapshot]);
          setEdges(es => es.some(e => e.id === edgeSnapshot.id) ? es : [...es, edgeSnapshot]);
          void saveNodes(graph.id!, [nodeSnapshot]);
            void saveEdges(graph.id!, [edgeSnapshot]);
          events.emit('node:created', { graphId: graph.id!, nodeId: nodeSnapshot.id });
          events.emit('edge:created', { graphId: graph.id!, edgeId: edgeSnapshot.id });
        }
      });
      return created;
    } catch (err) {
      // rollback not needed since we only mutate state after both creations succeed; if partial happened, remove.
      return null;
    }
  }, [graph]);

  // Internal helper to set node text without creating an undo entry (used by undo/redo)
  const setNodeTextRaw = useCallback((nodeId: string, nextText: string) => {
    if (!graph) return;
    let changed: NodeRecord | null = null;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId) {
        changed = { ...n, text: nextText.slice(0,255), lastModified: new Date().toISOString() };
        return changed;
      }
      return n;
    }));
    if (changed) {
      const c = changed as NodeRecord;
      void saveNodes(graph.id, [c]);
      events.emit('node:updated', { graphId: graph.id, nodeId, fields: { text: c.text } });
    }
  }, [graph]);

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    if (!graph) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const prevText = node.text || '';
    const newText = text.slice(0,255);
    if (prevText === newText) return; // no-op (FR-016 / FR-018)
    // Apply change
    setNodeTextRaw(nodeId, newText);
    // Push undo entry (FR-013, FR-016)
    pushUndo({
      type: 'text',
      undo: () => setNodeTextRaw(nodeId, prevText),
      redo: () => setNodeTextRaw(nodeId, newText)
    });
  }, [graph, nodes, setNodeTextRaw]);

  const updateNodeColors = useCallback((nodeId: string, bgColor?: string, textColor?: string) => {
    if (!graph) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const prevBg = node.bgColor;
    const prevText = node.textColor;
    const nextBg = bgColor ?? prevBg;
    const nextText = node.nodeKind === 'note' ? (textColor ?? prevText) : undefined; // rect ignores text color
    // No-op check
    if (prevBg === nextBg && prevText === nextText) return;
    const ts = new Date().toISOString();
    const updated: NodeRecord = { ...node, bgColor: nextBg, textColor: nextText, lastModified: ts } as NodeRecord;
    setNodes(ns => ns.map(n => n.id === nodeId ? updated : n));
    void saveNodes(graph.id, [updated]);
    events.emit('node:colorChanged', { nodeId, bgColor: nextBg, textColor: nextText });
    pushUndo({
      type: 'update-node-color',
      undo: () => {
        const restore: NodeRecord = { ...updated, bgColor: prevBg, textColor: prevText } as NodeRecord;
        setNodes(ns => ns.map(n => n.id === nodeId ? restore : n));
        void saveNodes(graph.id!, [restore]);
        events.emit('node:colorChanged', { nodeId, bgColor: prevBg, textColor: prevText });
      },
      redo: () => {
        const redoNode: NodeRecord = { ...updated, bgColor: nextBg, textColor: nextText } as NodeRecord;
        setNodes(ns => ns.map(n => n.id === nodeId ? redoNode : n));
        void saveNodes(graph.id!, [redoNode]);
        events.emit('node:colorChanged', { nodeId, bgColor: nextBg, textColor: nextText });
      }
    });
  }, [graph, nodes]);

  const updateNodeZOrder = useCallback((nodeId: string, front: boolean) => {
    if (!graph) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const prev = node.frontFlag !== false; // default true when undefined
    const next = !!front;
    if (prev === next) return; // no-op
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, frontFlag: next } : n));
    const snapshot = { id: nodeId, prev, next };
    void saveNodes(graph.id!, [{ ...node, frontFlag: next } as NodeRecord]);
    events.emit('node:zOrderChanged', { nodeId, frontFlag: next });
    pushUndo({
      type: 'update-node-zorder',
      undo: () => {
        setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, frontFlag: snapshot.prev } : n));
        void saveNodes(graph.id!, [{ ...node, frontFlag: snapshot.prev } as NodeRecord]);
        events.emit('node:zOrderChanged', { nodeId, frontFlag: snapshot.prev });
      },
      redo: () => {
        setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, frontFlag: snapshot.next } : n));
        void saveNodes(graph.id!, [{ ...node, frontFlag: snapshot.next } as NodeRecord]);
        events.emit('node:zOrderChanged', { nodeId, frontFlag: snapshot.next });
      }
    });
  }, [graph, nodes]);

  // Internal helper to persist a single node after mutation
  const persistNode = useCallback((nr: NodeRecord) => { if (graph) void saveNodes(graph.id, [nr]); }, [graph]);

  const updateNoteFormatting = useCallback((nodeId: string, patch: Partial<Pick<NodeRecord,'fontFamily'|'fontSize'|'fontWeight'|'italic'|'underline'|'highlight'|'backgroundOpacity'|'overflowMode'|'hideShapeWhenUnselected'|'maxHeight'>>) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId || n.nodeKind !== 'note') return n;
      const next: NodeRecord = { ...n, ...patch, lastModified: new Date().toISOString() };
      // Clamp logic
      if (next.fontSize && (next.fontSize < 10 || next.fontSize > 48)) {
        next.fontSize = Math.min(48, Math.max(10, next.fontSize));
      }
      if (typeof next.backgroundOpacity === 'number') {
        next.backgroundOpacity = Math.min(100, Math.max(0, Math.round(next.backgroundOpacity)));
      }
      persistNode(next);
      events.emit('note:formatChanged', { nodeId, patch });
      return next;
    }));
  }, [graph, persistNode]);

  const resetNoteFormatting = useCallback((nodeId: string) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId || n.nodeKind !== 'note') return n;
      const reset: NodeRecord = { ...n, fontFamily: 'Inter', fontSize: 14, fontWeight: 'normal', italic: false, underline: false, highlight: false, backgroundOpacity: 100, overflowMode: 'auto-resize', hideShapeWhenUnselected: false, maxHeight: 280, lastModified: new Date().toISOString() };
      persistNode(reset);
      events.emit('note:formatReset', { nodeId });
      return reset;
    }));
  }, [graph, persistNode]);

  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    if (!graph) return;
    // Capture previous position
    const prev = nodes.find(n => n.id === nodeId);
    if (!prev) return;
    const prevX = prev.x; const prevY = prev.y;
    const nextX = Math.round(x); const nextY = Math.round(y);
    if (prevX === nextX && prevY === nextY) return; // no-op
    // Apply new position
  let movedLocal: NodeRecord | null = null;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId) { movedLocal = { ...n, x: nextX, y: nextY, lastModified: new Date().toISOString() }; return movedLocal; }
      return n;
    }));
    if (movedLocal) {
      const moved = movedLocal as NodeRecord; // stable reference with explicit type
      void saveNodes(graph.id, [moved]);
      events.emit('node:moved', { graphId: graph.id, nodeId, x: moved.x, y: moved.y });
      pushUndo({
        type: 'move',
        undo: () => {
          setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, x: prevX, y: prevY } : n));
          void saveNodes(graph.id!, [{ ...moved, x: prevX, y: prevY } as NodeRecord]);
          events.emit('node:moved', { graphId: graph.id, nodeId, x: prevX, y: prevY });
        },
        redo: () => {
          setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, x: nextX, y: nextY } : n));
          void saveNodes(graph.id!, [{ ...moved, x: nextX, y: nextY } as NodeRecord]);
          events.emit('node:moved', { graphId: graph.id, nodeId, x: nextX, y: nextY });
        }
      });
    }
  }, [graph, nodes]);

  const updateViewport = useCallback((x: number, y: number, zoom: number) => {
    if (!graph) return;
    setGraph(g => g ? { ...g, viewport: { x, y, zoom } } : g);
    // persist asynchronously (non-blocking)
    updateGraphMeta(graph.id, { viewport: { x, y, zoom } }).catch(()=>{});
  }, [graph]);

  const cloneCurrent = useCallback(async () => {
    if (!graph) return;
    const g = await cloneGraph(graph.id);
    if (!g) return;
    // Load newly cloned graph
    const snap = await loadGraph(g.id);
    if (snap) {
      resetUndoHistory();
      setGraph(snap.graph);
      setNodes(snap.nodes);
      setEdges(snap.edges);
      mutationCounter.current++;
      await refreshList();
      setView('canvas');
      setSelectedNodeId(null); // Start with no selection (or could auto-select root in future)
    }
  }, [graph]);

  // FR-043: Delete node with hierarchical re-parenting of its children.
  const deleteNode = useCallback((nodeId: string) => {
    if (!graph) return;
    // root cannot be deleted (FR-043a)
    const rootId = (() => {
      let earliest: NodeRecord | null = null;
      for (const n of nodes) { if (!earliest || n.created < earliest.created) earliest = n; }
      return earliest?.id || null;
    })();
    if (nodeId === rootId) return; // no-op for root
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    // Build adjacency for neighbor detection (undirected)
    const adjacency = new Map<string, Set<string>>();
    function link(a: string, b: string) { (adjacency.get(a) || adjacency.set(a, new Set()).get(a)!).add(b); }
    for (const e of edges) { link(e.sourceNodeId, e.targetNodeId); link(e.targetNodeId, e.sourceNodeId); }
    const level = levels; // already cached map from provider effect
    const nodeLevel = level.get(nodeId);
    // If no levels known or node has no level, fallback: simple deletion without re-parent (safety)
    if (nodeLevel === undefined) {
      // Fallback simple delete + persist (no re-parent). Capture edges removed for undo.
      const nodeSnapshot = { ...node } as NodeRecord;
      const removedEdges: EdgeRecord[] = [];
      setNodes(ns => ns.filter(n => n.id !== nodeId));
      setEdges(es => {
        const kept = es.filter(e => {
          const rem = e.sourceNodeId === nodeId || e.targetNodeId === nodeId;
          if (rem) removedEdges.push(e as EdgeRecord);
          return !rem;
        });
        return kept;
      });
      mutationCounter.current++;
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (editingNodeId === nodeId) setEditingNodeId(null);
      events.emit('node:deleted', { graphId: graph.id, nodeId });
      void persistNodeDeletion(graph.id, nodeId, removedEdges.map(e=>e.id), []);
      // Push undo entry
      pushUndo({
        type: 'delete',
        undo: () => {
          // Restore node & removed edges
          setNodes(ns => [...ns, nodeSnapshot]);
          setEdges(es => [...es, ...removedEdges]);
          // Persist restores
          void saveNodes(graph.id!, [nodeSnapshot]);
          void saveEdges(graph.id!, removedEdges);
          events.emit('node:created', { graphId: graph.id!, nodeId: nodeSnapshot.id });
          removedEdges.forEach(e => events.emit('edge:created', { graphId: graph.id!, edgeId: e.id }));
        },
        redo: () => {
          setNodes(ns => ns.filter(n => n.id !== nodeSnapshot.id));
          setEdges(es => es.filter(e => !removedEdges.some(r => r.id === e.id)));
          void persistNodeDeletion(graph.id!, nodeSnapshot.id, removedEdges.map(e=>e.id), []);
          events.emit('node:deleted', { graphId: graph.id!, nodeId: nodeSnapshot.id });
        }
      });
      return;
    }
    // Determine parent candidates: neighbors with smaller level
    const neighbors = Array.from(adjacency.get(nodeId) || []);
    const parentCandidates = neighbors.filter(n => (level.get(n) ?? Infinity) < nodeLevel);
    // Choose deterministic parent: smallest level then earliest created timestamp
    let parentId: string | null = null;
    if (parentCandidates.length) {
      parentId = parentCandidates.reduce((best, cur) => {
        if (!best) return cur;
        const lb = level.get(best)!; const lc = level.get(cur)!;
        if (lc < lb) return cur;
        if (lc > lb) return best;
        // tie by created timestamp
        const nb = nodes.find(n => n.id === best)!; const nc = nodes.find(n => n.id === cur)!;
        if (nc.created < nb.created) return cur;
        return best;
      }, '' as string);
    }
    if (!parentId) {
      // treat like simple delete (same as above path) but with known levels.
      const nodeSnapshot = { ...node } as NodeRecord;
      const removedEdges: EdgeRecord[] = [];
      setNodes(ns => ns.filter(n => n.id !== nodeId));
      setEdges(es => {
        const kept = es.filter(e => {
          const rem = e.sourceNodeId === nodeId || e.targetNodeId === nodeId;
          if (rem) removedEdges.push(e as EdgeRecord);
          return !rem;
        });
        return kept;
      });
      mutationCounter.current++;
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (editingNodeId === nodeId) setEditingNodeId(null);
      events.emit('node:deleted', { graphId: graph.id, nodeId });
      void persistNodeDeletion(graph.id, nodeId, removedEdges.map(e=>e.id), []);
      pushUndo({
        type: 'delete',
        undo: () => {
          setNodes(ns => [...ns, nodeSnapshot]);
            setEdges(es => [...es, ...removedEdges]);
            void saveNodes(graph.id!, [nodeSnapshot]);
            void saveEdges(graph.id!, removedEdges);
            events.emit('node:created', { graphId: graph.id!, nodeId: nodeSnapshot.id });
            removedEdges.forEach(e => events.emit('edge:created', { graphId: graph.id!, edgeId: e.id }));
        },
        redo: () => {
          setNodes(ns => ns.filter(n => n.id !== nodeSnapshot.id));
          setEdges(es => es.filter(e => !removedEdges.some(r => r.id === e.id)));
          void persistNodeDeletion(graph.id!, nodeSnapshot.id, removedEdges.map(e=>e.id), []);
          events.emit('node:deleted', { graphId: graph.id!, nodeId: nodeSnapshot.id });
        }
      });
      return;
    }
    // Children: neighbors with level = nodeLevel + 1
    const childIds = neighbors.filter(n => level.get(n) === nodeLevel + 1);
    // Prepare diff
    const incidentEdgeIds = new Set<string>();
    const remainingEdges: EdgeRecord[] = [];
    for (const e of edges) {
      if (e.sourceNodeId === nodeId || e.targetNodeId === nodeId) { incidentEdgeIds.add(e.id); continue; }
      remainingEdges.push(e);
    }
    const newEdges: EdgeRecord[] = [];
    // Helper to check existing connectivity (undirected)
    function hasEdge(a: string, b: string) {
      return remainingEdges.some(e => (e.sourceNodeId === a && e.targetNodeId === b) || (e.sourceNodeId === b && e.targetNodeId === a));
    }
    for (const childId of childIds) {
      if (childId === parentId) continue; // safety
      if (hasEdge(parentId, childId)) continue; // duplicate prevention (FR-043b)
      try {
        // FR-043d handle assignment based on nearest cardinal direction
        const parentNode = nodes.find(n => n.id === parentId);
        const childNode = nodes.find(n => n.id === childId);
        let sourceHandleId: string | undefined; let targetHandleId: string | undefined;
        if (parentNode && childNode) {
          const APPROX_W = 100; const APPROX_H = 38; // heuristic sizing consistent with creation constants
            const px = parentNode.x + APPROX_W / 2; const py = parentNode.y + APPROX_H / 2;
            const cx = childNode.x + APPROX_W / 2; const cy = childNode.y + APPROX_H / 2;
            const dx = cx - px; const dy = cy - py;
            const adx = Math.abs(dx); const ady = Math.abs(dy);
            if (ady >= adx) { // vertical dominance or tie => vertical
              if (dy < 0) { sourceHandleId = 'n'; targetHandleId = 's'; }
              else { sourceHandleId = 's'; targetHandleId = 'n'; }
            } else {
              if (dx > 0) { sourceHandleId = 'e'; targetHandleId = 'w'; }
              else { sourceHandleId = 'w'; targetHandleId = 'e'; }
            }
        }
        const e = createEdge({ graphId: graph.id, sourceNodeId: parentId, targetNodeId: childId, sourceHandleId, targetHandleId });
        newEdges.push(e);
      } catch { /* ignore */ }
    }
    // Commit atomically
  const nodeSnapshot = { ...node } as NodeRecord;
  const removedEdgesFull = edges.filter(e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
  setNodes(ns => ns.filter(n => n.id !== nodeId));
  setEdges(es => [...remainingEdges, ...newEdges]);
    mutationCounter.current++;
  if (selectedNodeId === nodeId) setSelectedNodeId(null);
  if (editingNodeId === nodeId) setEditingNodeId(null);
    // Ordered events: node:deleted then edge:created sorted by child id (FR-043c)
    events.emit('node:deleted', { graphId: graph.id, nodeId });
    const sortedNew = [...newEdges].sort((a, b) => a.targetNodeId.localeCompare(b.targetNodeId));
    for (const e of sortedNew) { events.emit('edge:created', { graphId: graph.id, edgeId: e.id }); }
    // Persistence: remove node + incident edges, insert new edges
    const removedEdgeIds = Array.from(incidentEdgeIds);
    void persistNodeDeletion(graph.id, nodeId, removedEdgeIds, newEdges);
    // Push undo entry capturing node + removed edges + new (re-parent) edges
    pushUndo({
      type: 'delete',
      undo: () => {
        // restore node
        setNodes(ns => [...ns, nodeSnapshot]);
        // remove re-parent edges & add back original ones
        setEdges(es => {
          const filtered = es.filter(e => !newEdges.some(ne => ne.id === e.id));
          return [...filtered, ...removedEdgesFull];
        });
        void saveNodes(graph.id!, [nodeSnapshot]);
        void saveEdges(graph.id!, removedEdgesFull);
        events.emit('node:created', { graphId: graph.id!, nodeId: nodeSnapshot.id });
        removedEdgesFull.forEach(e => events.emit('edge:created', { graphId: graph.id!, edgeId: e.id }));
      },
      redo: () => {
        // reapply deletion with re-parent edges
        setNodes(ns => ns.filter(n => n.id !== nodeSnapshot.id));
        setEdges(es => {
          const woOriginal = es.filter(e => !removedEdgesFull.some(r => r.id === e.id));
          // ensure newEdges present
          const missing = newEdges.filter(ne => !woOriginal.some(e => e.id === ne.id));
          return [...woOriginal, ...missing];
        });
        void persistNodeDeletion(graph.id!, nodeSnapshot.id, removedEdgesFull.map(e=>e.id), newEdges);
        events.emit('node:deleted', { graphId: graph.id!, nodeId: nodeSnapshot.id });
        newEdges.forEach(e => events.emit('edge:created', { graphId: graph.id!, edgeId: e.id }));
      }
    });
  }, [graph, nodes, edges, levels, selectedNodeId, editingNodeId]);

  const setNodePositionEphemeral = useCallback((nodeId: string, x: number, y: number) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, x: Math.round(x), y: Math.round(y) } : n));
  }, [graph]);

  const startEditing = useCallback((nodeId: string) => { setEditingNodeId(nodeId); }, []);
  const stopEditing = useCallback(() => { setEditingNodeId(null); }, []);
  const selectNode = useCallback((id: string | null) => { setSelectedNodeId(id); }, []);

  // Toolbar actions
  const activateTool = useCallback((tool: 'note' | 'rect') => {
    setActiveTool(prev => {
      if (prev === tool) return prev; // handled by toggleTool
      events.emit('toolbar:toolActivated', { tool });
      return tool;
    });
  }, []);

  // Annotation creation (Feature 003)
  const addAnnotation = useCallback((kind: 'note' | 'rect', x: number, y: number) => {
    if (!graph) return null;
    const now = new Date().toISOString();
    const rec: NodeRecord = {
      id: crypto?.randomUUID ? crypto.randomUUID() : 'mf-' + Math.random().toString(16).slice(2),
      graphId: graph.id,
      text: '',
      x: Math.round(x),
      y: Math.round(y),
      created: now,
      lastModified: now,
      nodeKind: kind,
      frontFlag: true,
      width: kind === 'rect' ? 120 : (kind === 'note' ? 140 : undefined),
      height: kind === 'rect' ? 60 : (kind === 'note' ? 90 : undefined)
    };
    setNodes(ns => [...ns, rec]);
    events.emit('node:created', { graphId: graph.id, nodeId: rec.id });
    void saveNodes(graph.id, [rec]);
    const snapshot = { ...rec };
    pushUndo({
      type: kind === 'note' ? 'create-note' : 'create-rect',
      undo: () => {
        setNodes(ns => ns.filter(n => n.id !== snapshot.id));
        events.emit('node:deleted', { graphId: graph.id!, nodeId: snapshot.id });
        void persistNodeDeletion(graph.id!, snapshot.id, [], []);
      },
      redo: () => {
        setNodes(ns => ns.some(n => n.id === snapshot.id) ? ns : [...ns, snapshot]);
        events.emit('node:created', { graphId: graph.id!, nodeId: snapshot.id });
        void saveNodes(graph.id!, [snapshot]);
      }
    });
    setSelectedNodeId(rec.id);
    return rec;
  }, [graph]);

  // Rectangle resizing commit (FR-041..FR-045)
  const resizeRectangle = useCallback((nodeId: string, width: number, height: number, gesture?: { prevWidth: number; prevHeight: number; prevX: number; prevY: number; newX?: number; newY?: number }) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
  if (n.id === nodeId && (n.nodeKind === 'rect' || n.nodeKind === 'note')) {
        const w = Math.max(40, Math.round(width));
        const h = Math.max(40, Math.round(height));
        const nextX = gesture?.newX !== undefined ? Math.round(gesture.newX) : n.x;
        const nextY = gesture?.newY !== undefined ? Math.round(gesture.newY) : n.y;
        if (n.width === w && n.height === h && n.x === nextX && n.y === nextY) return n; // no-op
        const updated: NodeRecord = { ...n, width: w, height: h, x: nextX, y: nextY, lastModified: new Date().toISOString() };
        void saveNodes(graph.id!, [updated]);
        events.emit('node:resized', { nodeId, width: w, height: h, prevWidth: n.width ?? 120, prevHeight: n.height ?? 60 });
        const prevW = gesture?.prevWidth ?? (n.width ?? 120);
        const prevH = gesture?.prevHeight ?? (n.height ?? 60);
        const prevX = gesture?.prevX ?? n.x;
        const prevY = gesture?.prevY ?? n.y;
        if (!gesture || (prevW === w && prevH === h && prevX === nextX && prevY === nextY)) {
          return updated; // not a gesture commit OR no net change
        }
        pushUndo({
          type: 'resize-rect',
          undo: () => {
            setNodes(cur => cur.map(cn => cn.id === nodeId ? { ...cn, width: prevW, height: prevH, x: prevX, y: prevY } : cn));
            void saveNodes(graph.id!, [{ ...updated, width: prevW, height: prevH, x: prevX, y: prevY } as NodeRecord]);
            events.emit('node:resized', { nodeId, width: prevW, height: prevH, prevWidth: w, prevHeight: h });
          },
          redo: () => {
            setNodes(cur => cur.map(cn => cn.id === nodeId ? { ...cn, width: w, height: h, x: nextX, y: nextY } : cn));
            void saveNodes(graph.id!, [{ ...updated, width: w, height: h, x: nextX, y: nextY } as NodeRecord]);
            events.emit('node:resized', { nodeId, width: w, height: h, prevWidth: prevW, prevHeight: prevH });
          }
        });
        return updated;
      }
      return n;
    }));
  }, [graph]);

  // Ephemeral live rectangle resize (no persistence, no undo push) used during drag before mouseup
  const resizeRectangleEphemeral = useCallback((nodeId: string, width: number, height: number, x: number, y: number) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
  if (n.id === nodeId && (n.nodeKind === 'rect' || n.nodeKind === 'note')) {
        const w = Math.max(40, Math.round(width));
        const h = Math.max(40, Math.round(height));
        // Do not mutate lastModified here; this is transient visual feedback
        if (n.width === w && n.height === h && n.x === Math.round(x) && n.y === Math.round(y)) return n;
        return { ...n, width: w, height: h, x: Math.round(x), y: Math.round(y) } as NodeRecord;
      }
      return n;
    }));
  }, [graph]);

  // Minimal edge handle update (no undo yet) to support interactive endpoint dragging
  const updateEdgeHandles = useCallback((edgeId: string, sourceHandleId?: string | null, targetHandleId?: string | null) => {
    if (!graph) return;
    setEdges(es => es.map(e => {
      if (e.id !== edgeId) return e;
      // eslint-disable-next-line no-console
      console.debug('[updateEdgeHandles]', {
        edgeId,
        prevSource: e.sourceHandleId,
        prevTarget: e.targetHandleId,
        nextSource: sourceHandleId,
        nextTarget: targetHandleId
      });
      const next: EdgeRecord = {
        ...e,
        sourceHandleId: sourceHandleId === undefined ? e.sourceHandleId : sourceHandleId || undefined,
        targetHandleId: targetHandleId === undefined ? e.targetHandleId : targetHandleId || undefined,
        lastModified: new Date().toISOString()
      } as EdgeRecord;
      void saveEdges(graph.id!, [next]);
      return next;
    }));
  }, [graph]);

  // Update note alignment (horizontal / vertical) with undo (notes only)
  const updateNoteAlignment = useCallback((nodeId: string, h?: 'left'|'center'|'right', v?: 'top'|'middle'|'bottom') => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId && n.nodeKind === 'note') {
        const prevH = n.textAlign || 'center';
        const prevV = n.textVAlign || 'middle';
        const nextH = h ?? prevH;
        const nextV = v ?? prevV;
        if (prevH === nextH && prevV === nextV) return n;
        const updated: NodeRecord = { ...n, textAlign: nextH, textVAlign: nextV, lastModified: new Date().toISOString() };
        void saveNodes(graph.id!, [updated]);
        pushUndo({
          type: 'update-note-align',
          undo: () => {
            setNodes(cur => cur.map(cn => cn.id === nodeId ? { ...cn, textAlign: prevH, textVAlign: prevV } : cn));
            void saveNodes(graph.id!, [{ ...updated, textAlign: prevH, textVAlign: prevV } as NodeRecord]);
          },
          redo: () => {
            setNodes(cur => cur.map(cn => cn.id === nodeId ? { ...cn, textAlign: nextH, textVAlign: nextV } : cn));
            void saveNodes(graph.id!, [{ ...updated, textAlign: nextH, textVAlign: nextV } as NodeRecord]);
          }
        });
        return updated;
      }
      return n;
    }));
  }, [graph]);

  const toggleTool = useCallback((tool: 'note' | 'rect') => {
    setActiveTool(prev => {
      if (prev === tool) {
        events.emit('toolbar:toolDeactivated', { tool });
        return null;
      }
      events.emit('toolbar:toolActivated', { tool });
      return tool;
    });
  }, []);

  // Hierarchy computation (BFS) when structure changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!graph) { if (!cancelled) setLevels(new Map()); return; }
      try {
        const mod = await import('../lib/hierarchy');
        const rootId = mod.findRootNodeId(nodes as any);
        if (!rootId) { if (!cancelled) setLevels(new Map()); return; }
        const map = mod.computeLevels(rootId, nodes as any, edges as any);
        if (!cancelled) setLevels(map);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph?.id, mutationCounter.current]);


  React.useEffect(() => { refreshList(); }, []);

  return <Ctx.Provider value={{ graph, nodes, edges, graphs, view, newGraph, selectGraph, openLibrary, renameGraph, removeGraph, addNode, addEdge, addConnectedNode, updateNodeText, updateNodeColors, updateNodeZOrder, updateNoteAlignment, moveNode, updateViewport, setNodePositionEphemeral, deleteNode, cloneCurrent, editingNodeId, startEditing, stopEditing, pendingChanges, selectedNodeId, selectNode, levels, activeTool, activateTool, toggleTool, addAnnotation, resizeRectangle, resizeRectangleEphemeral, updateEdgeHandles, updateNoteFormatting, resetNoteFormatting }}>{children}</Ctx.Provider>;
};

export function useGraph() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('GraphProvider missing');
  return ctx;
}
