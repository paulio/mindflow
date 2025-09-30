import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createGraph, loadGraph, saveNodes, saveEdges, deleteGraph, updateGraphMeta, listGraphs } from '../lib/indexeddb';
import { createNode, createEdge } from '../lib/graph-domain';
import { NodeRecord, EdgeRecord, GraphRecord } from '../lib/types';
import { events } from '../lib/events';

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
  moveNode(nodeId: string, x: number, y: number): void;
  updateViewport(x: number, y: number, zoom: number): void;
  // Ephemeral position update during drag (no persistence, no lastModified update)
  setNodePositionEphemeral(nodeId: string, x: number, y: number): void;
  deleteNode(nodeId: string): void; // FR-043 deletion with re-parenting
  // Centralized edit focus management so ReactFlow re-renders do not lose edit mode when selection changes.
  editingNodeId: string | null;
  startEditing(nodeId: string): void;
  stopEditing(): void;
  pendingChanges: boolean; // coarse indicator for unsaved changes (future: integrate with autosave scheduler)
  selectedNodeId: string | null;
  selectNode(id: string | null): void;
  levels: Map<string, number>;
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
  const mutationCounter = useRef(0);

  async function refreshList() { setGraphs(await listGraphs()); }

  const newGraph = useCallback(async () => {
    const g = await createGraph('Untitled Map');
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
      return created;
    } catch (err) {
      // rollback not needed since we only mutate state after both creations succeed; if partial happened, remove.
      return null;
    }
  }, [graph]);

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    if (!graph) return;
  let updated: NodeRecord | null = null;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId) { updated = { ...n, text: text.slice(0,255), lastModified: new Date().toISOString() }; return updated; }
      return n; }));
    if (updated) {
      const u = updated; // stable reference for TS
      void saveNodes(graph.id, [u]);
  events.emit('node:updated', { graphId: graph.id, nodeId, fields: { text: (u as any).text } });
    }
  }, [graph]);

  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    if (!graph) return;
    let moved: NodeRecord | null = null;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId) { moved = { ...n, x: Math.round(x), y: Math.round(y), lastModified: new Date().toISOString() }; return moved; }
      return n;
    }));
    const m = moved as NodeRecord | null;
    if (m) {
      void saveNodes(graph.id, [m]);
      events.emit('node:moved', { graphId: graph.id, nodeId, x: m.x, y: m.y });
    }
  }, [graph]);

  const updateViewport = useCallback((x: number, y: number, zoom: number) => {
    if (!graph) return;
    setGraph(g => g ? { ...g, viewport: { x, y, zoom } } : g);
    // persist asynchronously (non-blocking)
    updateGraphMeta(graph.id, { viewport: { x, y, zoom } }).catch(()=>{});
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
      setNodes(ns => ns.filter(n => n.id !== nodeId));
      setEdges(es => es.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId));
      mutationCounter.current++;
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (editingNodeId === nodeId) setEditingNodeId(null);
      events.emit('node:deleted', { graphId: graph.id, nodeId });
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
      // No parent (isolated or cycle scenario) -> simple delete
      setNodes(ns => ns.filter(n => n.id !== nodeId));
      setEdges(es => es.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId));
      mutationCounter.current++;
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (editingNodeId === nodeId) setEditingNodeId(null);
      events.emit('node:deleted', { graphId: graph.id, nodeId });
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
        const e = createEdge({ graphId: graph.id, sourceNodeId: parentId, targetNodeId: childId });
        newEdges.push(e);
      } catch { /* ignore */ }
    }
    // Commit atomically
  setNodes(ns => ns.filter(n => n.id !== nodeId));
  setEdges(es => [...remainingEdges, ...newEdges]);
    mutationCounter.current++;
  if (selectedNodeId === nodeId) setSelectedNodeId(null);
  if (editingNodeId === nodeId) setEditingNodeId(null);
    // Ordered events: node:deleted then edge:created sorted by child id (FR-043c)
    events.emit('node:deleted', { graphId: graph.id, nodeId });
    const sortedNew = [...newEdges].sort((a, b) => a.targetNodeId.localeCompare(b.targetNodeId));
    for (const e of sortedNew) { events.emit('edge:created', { graphId: graph.id, edgeId: e.id }); }
    // Persistence (best-effort asynchronous)
    void saveNodes(graph.id, nodes.filter(n => n.id !== nodeId));
    if (newEdges.length) void saveEdges(graph.id, newEdges);
  }, [graph, nodes, edges, levels, selectedNodeId, editingNodeId]);

  const setNodePositionEphemeral = useCallback((nodeId: string, x: number, y: number) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, x: Math.round(x), y: Math.round(y) } : n));
  }, [graph]);

  const startEditing = useCallback((nodeId: string) => { setEditingNodeId(nodeId); }, []);
  const stopEditing = useCallback(() => { setEditingNodeId(null); }, []);
  const selectNode = useCallback((id: string | null) => { setSelectedNodeId(id); }, []);

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

  return <Ctx.Provider value={{ graph, nodes, edges, graphs, view, newGraph, selectGraph, openLibrary, renameGraph, removeGraph, addNode, addEdge, addConnectedNode, updateNodeText, moveNode, updateViewport, setNodePositionEphemeral, deleteNode, editingNodeId, startEditing, stopEditing, pendingChanges, selectedNodeId, selectNode, levels }}>{children}</Ctx.Provider>;
};

export function useGraph() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('GraphProvider missing');
  return ctx;
}
