import React, { createContext, useContext, useState, useCallback } from 'react';
import { createGraph, loadGraph, saveNodes, saveEdges, deleteGraph, updateGraphMeta, listGraphs } from '../lib/indexeddb';
import { createNode, createEdge } from '../lib/graph-domain';
import { NodeRecord, EdgeRecord, GraphRecord } from '../lib/types';
import { events } from '../lib/events';

interface GraphState { graph: GraphRecord | null; nodes: NodeRecord[]; edges: EdgeRecord[]; graphs: GraphRecord[]; }

interface GraphContext extends GraphState {
  newGraph(): Promise<void>;
  selectGraph(id: string): Promise<void>;
  renameGraph(name: string): Promise<void>;
  removeGraph(id: string): Promise<void>;
  addNode(x: number, y: number): NodeRecord | null;
  addEdge(source: string, target: string, sourceHandleId?: string, targetHandleId?: string): void;
  addConnectedNode(sourceNodeId: string, x: number, y: number, sourceHandleId?: string, targetHandleId?: string): NodeRecord | null; // atomic node+edge with directional handle metadata
  updateNodeText(nodeId: string, text: string): void;
  moveNode(nodeId: string, x: number, y: number): void;
  // Centralized edit focus management so ReactFlow re-renders do not lose edit mode when selection changes.
  editingNodeId: string | null;
  startEditing(nodeId: string): void;
  stopEditing(): void;
}

const Ctx = createContext<GraphContext | null>(null);

export const GraphProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [graph, setGraph] = useState<GraphRecord | null>(null);
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [edges, setEdges] = useState<EdgeRecord[]>([]);
  const [graphs, setGraphs] = useState<GraphRecord[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  async function refreshList() { setGraphs(await listGraphs()); }

  const newGraph = useCallback(async () => {
    const g = await createGraph('Untitled Map');
    setGraph(g);
    // Create an initial root node so every new graph starts non-empty per requirement.
    const root = createNode({ graphId: g.id, x: 0, y: 0, text: 'New Thought' });
    setNodes([root]);
    setEdges([]);
    events.emit('graph:created', { graphId: g.id });
    events.emit('node:created', { graphId: g.id, nodeId: root.id });
  void saveNodes(g.id, [root]);
    await refreshList();
  }, []);

  const selectGraph = useCallback(async (id: string) => {
    const snap = await loadGraph(id);
    if (snap) {
      setGraph(snap.graph);
      setNodes(snap.nodes);
      setEdges(snap.edges);
      events.emit('graph:loaded', { graphId: snap.graph.id });
    }
  }, []);

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

  const startEditing = useCallback((nodeId: string) => { setEditingNodeId(nodeId); }, []);
  const stopEditing = useCallback(() => { setEditingNodeId(null); }, []);


  React.useEffect(() => { refreshList(); }, []);

  return <Ctx.Provider value={{ graph, nodes, edges, graphs, newGraph, selectGraph, renameGraph, removeGraph, addNode, addEdge, addConnectedNode, updateNodeText, moveNode, editingNodeId, startEditing, stopEditing }}>{children}</Ctx.Provider>;
};

export function useGraph() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('GraphProvider missing');
  return ctx;
}
