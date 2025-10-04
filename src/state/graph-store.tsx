import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import pkg from '../../package.json';
import { createGraph, loadGraph, saveNodes, saveEdges, deleteGraph, updateGraphMeta, listGraphs, cloneGraph, persistNodeDeletion, saveReferences, deleteReferences, initDB, generateId, getGraphSnapshots } from '../lib/indexeddb';
import { createNode, createEdge } from '../lib/graph-domain';
import { computeInitialBorderColour, BORDER_COLOUR_PALETTE, ROOT_FALLBACK } from '../lib/node-border-palette';
import { NodeRecord, EdgeRecord, GraphRecord, ReferenceConnectionRecord } from '../lib/types';
import { events } from '../lib/events';
import { pushUndo, resetUndoHistory } from '../hooks/useUndoRedo';
import {
  inspectImportArchive,
  ImportArchiveInspection,
  ImportArchiveOptions,
  ImportSummary,
  ConflictResolutionResult,
  ImportEntry,
  CURRENT_MAP_SCHEMA_VERSION,
  ImportSession,
  generateExportArchive,
  ExportArchiveResult,
  ExportArchiveOptions,
  EXPORT_MANIFEST_VERSION,
} from '../lib/export';

const APP_VERSION = (pkg as { version?: string }).version ?? '0.0.0';

type ExportMapsOptions = Pick<ExportArchiveOptions, 'signal' | 'pauseAutosave' | 'resumeAutosave' | 'logger' | 'fileName' | 'notes'>;

export interface ImportProgressEvent {
  stage: 'applying' | 'completed' | 'cancelled' | 'failed';
  processed: number;
  total: number;
  entry?: ImportEntry;
  summary?: ImportSummary;
  message?: string;
}

type ViewMode = 'library' | 'canvas';
interface GraphState { graph: GraphRecord | null; nodes: NodeRecord[]; edges: EdgeRecord[]; graphs: GraphRecord[]; view: ViewMode; references: ReferenceConnectionRecord[]; }

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
  // Legacy single selection (will remain for compatibility) + new multi-select state
  selectedNodeId: string | null;
  selectNode(id: string | null): void;
  selectedNodeIds: string[]; // ordered unique list
  replaceSelection(ids: string[]): void;
  addToSelection(ids: string[]): void;
  toggleSelection(id: string): void;
  clearSelection(): void;
  marquee: { active: boolean; startX: number; startY: number; currentX: number; currentY: number; additive: boolean } | null;
  beginMarquee(x: number, y: number, additive: boolean): void;
  updateMarquee(x: number, y: number): void;
  endMarquee(): { startX: number; startY: number; endX: number; endY: number; additive: boolean } | null;
  cancelMarquee(): void;
  activateMarquee(): void;
  interactionMode: 'grab' | 'select';
  setInteractionMode(mode: 'grab' | 'select'): void;
  selectedReferenceId: string | null;
  selectReference(id: string | null): void;
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
  // Reference APIs
  createReference(sourceNodeId: string, targetNodeId: string, style?: 'single'|'double'|'none', sourceHandleId?: string, targetHandleId?: string): void;
  updateReferenceStyle(id: string, style: 'single'|'double'|'none'): void;
  repositionReference(id: string, newSourceNodeId: string, newTargetNodeId: string, newSourceHandleId?: string, newTargetHandleId?: string): void;
  deleteReference(id: string): void;
  updateReferenceLabel(id: string, label: string): void;
  toggleReferenceLabelVisibility(id: string, hidden: boolean): void;
  // Border colour override APIs (Feature 007)
  overrideNodeBorder(nodeId: string, hex: string): void;
  clearNodeBorderOverride(nodeId: string): void;
  getNodeBorderInfo(nodeId: string): { colour: string; overridden: boolean; original: string } | null;
  importContext: ImportArchiveInspection | null;
  stageImport(source: Blob | ArrayBuffer | ArrayBufferView | File, options?: ImportArchiveOptions): Promise<ImportArchiveInspection>;
  resolveImportConflict(mapId: string, resolution: ConflictResolutionResult): void;
  finalizeImportSession(action: 'commit' | 'cancel', options?: { onProgress?: (event: ImportProgressEvent) => void }): Promise<ImportSummary | null>;
  clearImportSession(): void;
  selectedLibraryIds: string[];
  replaceLibrarySelection(ids: string[]): void;
  addLibrarySelection(ids: string[]): void;
  toggleLibrarySelection(id: string): void;
  clearLibrarySelection(): void;
  exportMaps(ids: string[], options?: ExportMapsOptions): Promise<ExportArchiveResult>;
}

const Ctx = createContext<GraphContext | null>(null);

export const GraphProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [graph, setGraph] = useState<GraphRecord | null>(null);
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [edges, setEdges] = useState<EdgeRecord[]>([]);
  const [graphs, setGraphs] = useState<GraphRecord[]>([]);
  const [references, setReferences] = useState<ReferenceConnectionRecord[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('library');
  const [pendingChanges, setPendingChanges] = useState<boolean>(false); // placeholder (would toggle on edits & clear on autosave success)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<GraphContext['marquee']>(null);
  const [interactionMode, setInteractionMode] = useState<'grab' | 'select'>('select');
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Map<string, number>>(new Map());
  const [activeTool, setActiveTool] = useState<'note' | 'rect' | null>(null);
  const [importContext, setImportContext] = useState<ImportArchiveInspection | null>(null);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const mutationCounter = useRef(0);

  const normalizeLibrarySelection = useCallback((ids: string[]) => {
    if (!ids.length) return ids;
    const allowed = graphs.length ? new Set(graphs.map(g => g.id)) : null;
    const seen = new Set<string>();
    const next: string[] = [];
    for (const id of ids) {
      if (!id) continue;
      if (allowed && !allowed.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      next.push(id);
    }
    if (next.length === ids.length) {
      let identical = true;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] !== ids[i]) { identical = false; break; }
      }
      if (identical) return ids;
    }
    return next;
  }, [graphs]);

  async function refreshList() {
    try {
      if (typeof window === 'undefined') return; // test/headless guard
      setGraphs(await listGraphs());
    } catch { /* ignore listing errors in headless */ }
  }

  async function persistGraphSnapshotRecord(
    graphRecord: GraphRecord,
    nodes: NodeRecord[],
    edges: EdgeRecord[],
    references: ReferenceConnectionRecord[],
  ) {
    const db = await initDB();
    const stores: string[] = ['graphs', 'graphNodes', 'graphEdges'];
    if (db.objectStoreNames.contains('graphReferences')) stores.push('graphReferences');
    const tx = db.transaction(stores, 'readwrite');
    await tx.objectStore('graphs').put(graphRecord);
    const nodesStore = tx.objectStore('graphNodes');
    for (const node of nodes) {
      await nodesStore.put(node);
    }
    const edgesStore = tx.objectStore('graphEdges');
    for (const edge of edges) {
      await edgesStore.put(edge);
    }
    if (db.objectStoreNames.contains('graphReferences')) {
      const refsStore = tx.objectStore('graphReferences');
      for (const reference of references) {
        await refsStore.put(reference);
      }
    }
    await tx.done;
  }

  async function writeImportedGraph(
    entry: ImportEntry,
    action: 'add' | 'overwrite',
    resolvedName?: string,
  ): Promise<GraphRecord> {
    const now = new Date().toISOString();
    if (action === 'overwrite') {
      const targetId = entry.snapshot.id;
      await deleteGraph(targetId);
      const graphRecord: GraphRecord = {
        ...entry.payload.graph,
        id: targetId,
        name: resolvedName ?? entry.snapshot.name,
        lastModified: entry.payload.graph.lastModified ?? now,
        lastOpened: now,
        created: entry.payload.graph.created ?? now,
        schemaVersion: entry.payload.graph.schemaVersion ?? CURRENT_MAP_SCHEMA_VERSION,
        settings: entry.payload.graph.settings ? { ...entry.payload.graph.settings } : { autoLoadLast: true },
        viewport: entry.payload.graph.viewport ? { ...entry.payload.graph.viewport } : { x: 0, y: 0, zoom: 1 },
      };
      const nodes = entry.payload.nodes.map<NodeRecord>(node => ({ ...node, graphId: targetId }));
      const edges = entry.payload.edges.map<EdgeRecord>(edge => ({ ...edge, graphId: targetId }));
      const references = entry.payload.references.map<ReferenceConnectionRecord>(reference => ({ ...reference, graphId: targetId }));
      await persistGraphSnapshotRecord(graphRecord, nodes, edges, references);
      return graphRecord;
    }

    const newId = generateId();
    const graphRecord: GraphRecord = {
      ...entry.payload.graph,
      id: newId,
      name: resolvedName ?? entry.snapshot.name,
      lastModified: entry.payload.graph.lastModified ?? now,
      lastOpened: now,
      created: entry.payload.graph.created ?? now,
      schemaVersion: entry.payload.graph.schemaVersion ?? CURRENT_MAP_SCHEMA_VERSION,
      settings: entry.payload.graph.settings ? { ...entry.payload.graph.settings } : { autoLoadLast: true },
      viewport: entry.payload.graph.viewport ? { ...entry.payload.graph.viewport } : { x: 0, y: 0, zoom: 1 },
    };
    const nodes = entry.payload.nodes.map<NodeRecord>(node => ({ ...node, graphId: newId }));
    const edges = entry.payload.edges.map<EdgeRecord>(edge => ({ ...edge, graphId: newId }));
    const references = entry.payload.references.map<ReferenceConnectionRecord>(reference => ({ ...reference, graphId: newId }));
    await persistGraphSnapshotRecord(graphRecord, nodes, edges, references);
    return graphRecord;
  }

  const stageImport = useCallback(async (
    source: Blob | ArrayBuffer | ArrayBufferView | File,
    options?: ImportArchiveOptions,
  ): Promise<ImportArchiveInspection> => {
    const merged: ImportArchiveOptions = {
      ...(options ?? {}),
      existingGraphs: graphs,
    };
    const inspection = await inspectImportArchive(source as Blob | ArrayBuffer | ArrayBufferView, merged);
    setImportContext(inspection);
    return inspection;
  }, [graphs]);

  const resolveImportConflict = useCallback((mapId: string, resolution: ConflictResolutionResult) => {
    const stamped: ConflictResolutionResult = {
      ...resolution,
      timestamp: resolution.timestamp ?? new Date().toISOString(),
    };
    setImportContext(ctx => {
      if (!ctx) return ctx;
      const entries = ctx.session.entries.map(entry =>
        entry.snapshot.id === mapId ? { ...entry, resolution: stamped } : entry,
      );
      return { ...ctx, session: { ...ctx.session, entries } };
    });
  }, []);

  const clearImportSession = useCallback(() => {
    setImportContext(null);
  }, []);

  const finalizeImportSession = useCallback(async (
    action: 'commit' | 'cancel',
    opts?: { onProgress?: (event: ImportProgressEvent) => void },
  ): Promise<ImportSummary | null> => {
    if (!importContext) return null;
    const onProgress = opts?.onProgress;
    const entries = importContext.session.entries;
    const total = entries.length;

    if (action === 'cancel') {
      const summary: ImportSummary = {
        totalProcessed: total,
        succeeded: 0,
        skipped: total,
        failed: 0,
        messages: entries.map(entry => ({
          mapId: entry.snapshot.id,
          level: 'warning',
          detail: 'Import cancelled by user before applying.',
        })),
      };
      const updatedSession: ImportSession = { ...importContext.session, status: 'cancelled', summary };
      setImportContext({ manifest: importContext.manifest, session: updatedSession });
      onProgress?.({ stage: 'cancelled', processed: 0, total, summary, message: 'Import cancelled' });
      return summary;
    }

    const cancelResolution = entries.find(entry => entry.resolution?.action === 'cancel');
    if (cancelResolution) {
      const summary: ImportSummary = {
        totalProcessed: total,
        succeeded: 0,
        skipped: total,
        failed: 0,
        messages: [{
          mapId: cancelResolution.snapshot.id,
          level: 'warning',
          detail: 'Import cancelled after conflict resolution.',
        }],
      };
      const updatedSession: ImportSession = { ...importContext.session, status: 'cancelled', summary };
      setImportContext({ manifest: importContext.manifest, session: updatedSession });
      onProgress?.({ stage: 'cancelled', processed: 0, total, summary, message: 'Import cancelled after conflict resolution' });
      return summary;
    }

    const unresolved = entries.filter(entry => entry.conflict && !entry.resolution);
    if (unresolved.length) {
      throw new Error('Resolve all map conflicts before applying the import.');
    }

    setImportContext(ctx => ctx ? ({
      manifest: ctx.manifest,
      session: { ...ctx.session, status: 'applying' },
    }) : ctx);

    const summary: ImportSummary = {
      totalProcessed: total,
      succeeded: 0,
      skipped: 0,
      failed: 0,
      messages: [],
    };

    let processed = 0;
    for (const entry of entries) {
      onProgress?.({ stage: 'applying', processed, total, entry, message: `Processing ${processed + 1} of ${total}` });
      const actionForEntry: 'add' | 'overwrite' = entry.conflict ? (entry.resolution?.action === 'overwrite' ? 'overwrite' : 'add') : 'add';
      const resolvedName = entry.conflict && actionForEntry === 'add' ? entry.resolution?.resolvedName : undefined;
      try {
        const graphRecord = await writeImportedGraph(entry, actionForEntry, resolvedName);
        summary.succeeded += 1;
        summary.messages.push({
          mapId: graphRecord.id,
          level: 'info',
          detail: actionForEntry === 'overwrite'
            ? `Overwrote existing map "${entry.snapshot.name}"`
            : `Imported new map "${graphRecord.name}"`,
        });
      } catch (error) {
        summary.failed += 1;
        summary.messages.push({
          mapId: entry.snapshot.id,
          level: 'error',
          detail: error instanceof Error ? error.message : 'Import failed due to unknown error.',
        });
      }
      processed += 1;
    }

    summary.skipped = summary.totalProcessed - (summary.succeeded + summary.failed);

    const status: ImportSession['status'] = summary.failed ? 'failed' : 'completed';
    const updatedSession: ImportSession = { ...importContext.session, status, summary };
    setImportContext({ manifest: importContext.manifest, session: updatedSession });
    await refreshList();
    if (!summary.failed) {
      setSelectedLibraryIds([]);
    }
    const completionStage: ImportProgressEvent['stage'] = summary.failed ? 'failed' : 'completed';
    onProgress?.({ stage: completionStage, processed, total, summary, message: summary.failed ? 'Import completed with errors' : 'Import completed successfully' });
    return summary;
  }, [importContext, refreshList, setSelectedLibraryIds]);

  const newGraph = useCallback(async () => {
    const g = await createGraph('Untitled Map');
    resetUndoHistory(); // Clear any prior history (FR-021 / session boundary)
    setGraph(g);
    // Create an initial root node so every new graph starts non-empty per requirement.
    const root = createNode({ graphId: g.id, x: 0, y: 0, text: 'New Thought' });
    // Assign initial border colour (depth 0)
  const mapping = computeInitialBorderColour(0, BORDER_COLOUR_PALETTE);
  // Assign background colour from depth mapping; border always uses last palette entry
  const lastIdx = BORDER_COLOUR_PALETTE.length - 1;
  (root as NodeRecord).bgColor = mapping.colour;
  (root as NodeRecord).hierDepth = 0;
  (root as NodeRecord).originalBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
  (root as NodeRecord).currentBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
  (root as NodeRecord).borderPaletteIndex = lastIdx;
  (root as NodeRecord).borderOverrideFlag = false;
    setNodes([root]);
    setEdges([]);
  mutationCounter.current++;
    events.emit('graph:created', { graphId: g.id });
    events.emit('node:created', { graphId: g.id, nodeId: root.id });
  void saveNodes(g.id, [root]);
    await refreshList();
    // In test / SSR environments window is undefined; setting view can trigger code paths expecting DOM.
    if (typeof window !== 'undefined') {
      setView('canvas');
    }
  }, []);

  const selectGraph = useCallback(async (id: string) => {
    const snap = await loadGraph(id);
    if (snap) {
      resetUndoHistory(); // Always clear history even if reloading same graph
      setGraph(snap.graph);
      // Hydrate legacy nodes missing border fields
      let mutated = false;
      let levelMap: Map<string, number> = new Map();
      try {
        const mod = await import('../lib/hierarchy');
        const rootId = mod.findRootNodeId(snap.nodes as any);
        if (rootId) levelMap = mod.computeLevels(rootId, snap.nodes as any, snap.edges as any);
      } catch { /* ignore */ }
      const hydratedNodes = snap.nodes.map(n => {
        if (n.originalBorderColour && n.currentBorderColour && n.borderPaletteIndex !== undefined && n.borderOverrideFlag !== undefined) return n;
        // Need to hydrate
        const depth = levelMap.get(n.id) ?? 0;
        const mapping = computeInitialBorderColour(depth, BORDER_COLOUR_PALETTE);
        const lastIdx = BORDER_COLOUR_PALETTE.length - 1;
        const copy: NodeRecord = { ...n };
        // Preserve existing border fields if present, else hydrate with last palette entry
        if (!copy.originalBorderColour) {
          copy.originalBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
        }
        if (!copy.currentBorderColour) {
          copy.currentBorderColour = copy.originalBorderColour;
        }
        if (copy.borderPaletteIndex === undefined) {
          copy.borderPaletteIndex = lastIdx;
        }
        // Hydrate bgColor from depth mapping only if none set
  if (!copy.bgColor) copy.bgColor = mapping.colour;
  if (copy.hierDepth === undefined) copy.hierDepth = depth;
        copy.borderOverrideFlag = copy.borderOverrideFlag ?? false;
        mutated = true;
        return copy;
      });
      setNodes(hydratedNodes);
      setEdges(snap.edges);
      setReferences(snap.references || []);
  mutationCounter.current++;
      events.emit('graph:loaded', { graphId: snap.graph.id });
      setView('canvas');
      setSelectedNodeId(null);
      if (mutated) {
        // Persist hydrated fields
        void saveNodes(snap.graph.id, hydratedNodes);
      }
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
    // Depth heuristic: unattached node => treat as depth 0 until connected
  const mapping = computeInitialBorderColour(0, BORDER_COLOUR_PALETTE);
  const lastIdx = BORDER_COLOUR_PALETTE.length - 1;
  (n as NodeRecord).bgColor = mapping.colour;
  (n as NodeRecord).hierDepth = 0; // unattached until connected
  (n as NodeRecord).originalBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
  (n as NodeRecord).currentBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
  (n as NodeRecord).borderPaletteIndex = lastIdx;
  (n as NodeRecord).borderOverrideFlag = false;
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
    const parentNode = nodes.find(n => n.id === sourceNodeId) as NodeRecord | undefined;
    let created: NodeRecord | null = null;
    try {
      // eslint-disable-next-line no-console
      console.debug('[graph-store] addConnectedNode invoked', { sourceNodeId, x, y, sourceHandleId, targetHandleId });
      created = createNode({ graphId: graph.id, x, y });
      // Determine depth using current levels map
  const parentDepth = (parentNode?.hierDepth !== undefined ? parentNode.hierDepth : (levels.get(sourceNodeId) ?? 0));
  const childDepth = parentDepth + 1;
  const mapping = computeInitialBorderColour(childDepth, BORDER_COLOUR_PALETTE);
  const lastIdx = BORDER_COLOUR_PALETTE.length - 1;
  (created as NodeRecord).bgColor = mapping.colour;
  (created as NodeRecord).hierDepth = childDepth;
  (created as NodeRecord).originalBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
  (created as NodeRecord).currentBorderColour = BORDER_COLOUR_PALETTE[lastIdx];
  (created as NodeRecord).borderPaletteIndex = lastIdx;
  (created as NodeRecord).borderOverrideFlag = false;
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
  }, [graph, nodes, levels]);

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

  // ===== Reference Connections =====
  const duplicateRefExists = useCallback((sourceNodeId: string, targetNodeId: string, style: string) => {
    return references.some(r => r.sourceNodeId === sourceNodeId && r.targetNodeId === targetNodeId && r.style === style);
  }, [references]);

  const createReference = useCallback((sourceNodeId: string, targetNodeId: string, style: 'single'|'double'|'none' = 'single', sourceHandleId?: string, targetHandleId?: string) => {
    if (!graph) return;
    if (sourceNodeId === targetNodeId) return;
    if (duplicateRefExists(sourceNodeId, targetNodeId, style)) {
      events.emit('reference:duplicateBlocked', { sourceNodeId, targetNodeId, style });
      return;
    }
    const now = new Date().toISOString();
    const ref: ReferenceConnectionRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'ref-' + Math.random().toString(16).slice(2),
      graphId: graph.id,
      sourceNodeId,
      targetNodeId,
      sourceHandleId,
      targetHandleId,
      style,
      label: '',
      labelHidden: false,
      created: now,
      lastModified: now
    };
    setReferences(rs => {
      const next = [...rs, ref];
      void saveReferences(graph.id, [ref]);
      return next;
    });
    events.emit('reference:created', { id: ref.id, graphId: graph.id, sourceNodeId, targetNodeId, style });
    pushUndo({
      type: 'create-reference',
      undo: () => {
        setReferences(rs => rs.filter(r => r.id !== ref.id));
        events.emit('reference:deleted', { id: ref.id, graphId: graph.id });
      },
      redo: () => {
        setReferences(rs => rs.some(r => r.id === ref.id) ? rs : [...rs, ref]);
        events.emit('reference:created', { id: ref.id, graphId: graph.id, sourceNodeId, targetNodeId, style });
      }
    });
  }, [graph, duplicateRefExists]);

  const updateReferenceStyle = useCallback((id: string, style: 'single'|'double'|'none') => {
    setReferences(rs => rs.map(r => {
      if (r.id !== id) return r;
      if (r.style === style) return r;
      const prev = r.style;
      pushUndo({
        type: 'reference-style',
        undo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, style: prev } : rr)),
        redo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, style } : rr))
      });
      events.emit('reference:styleChanged', { id, style });
  const updated = { ...r, style, lastModified: new Date().toISOString() };
  void saveReferences(r.graphId, [updated]);
  return updated;
    }));
  }, []);

  const repositionReference = useCallback((id: string, newSourceNodeId: string, newTargetNodeId: string, newSourceHandleId?: string, newTargetHandleId?: string) => {
    if (newSourceNodeId === newTargetNodeId) return;
    setReferences(rs => rs.map(r => {
      if (r.id !== id) return r;
      const prev = { src: r.sourceNodeId, tgt: r.targetNodeId, sh: r.sourceHandleId, th: r.targetHandleId };
      const updated: ReferenceConnectionRecord = { ...r, sourceNodeId: newSourceNodeId, targetNodeId: newTargetNodeId, sourceHandleId: newSourceHandleId, targetHandleId: newTargetHandleId, lastModified: new Date().toISOString() };
      pushUndo({
        type: 'reference-reposition',
        undo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, sourceNodeId: prev.src, targetNodeId: prev.tgt, sourceHandleId: prev.sh, targetHandleId: prev.th } : rr)),
        redo: () => setReferences(inner => inner.map(rr => rr.id === id ? updated : rr))
      });
      events.emit('reference:repositioned', { id, sourceNodeId: newSourceNodeId, targetNodeId: newTargetNodeId });
  void saveReferences(r.graphId, [updated]);
  return updated;
    }));
  }, []);

  const deleteReference = useCallback((id: string) => {
    setReferences(rs => {
      const target = rs.find(r => r.id === id);
      if (!target) return rs;
      // Persist deletion immediately
      void deleteReferences(target.graphId, [id]);
      pushUndo({
        type: 'delete-reference',
        undo: () => {
          setReferences(inner => inner.some(r => r.id === id) ? inner : [...inner, target]);
          void saveReferences(target.graphId, [target]);
          events.emit('reference:created', { id: target.id, graphId: target.graphId, sourceNodeId: target.sourceNodeId, targetNodeId: target.targetNodeId, style: target.style });
        },
        redo: () => {
          setReferences(inner => inner.filter(r => r.id !== id));
          void deleteReferences(target.graphId, [id]);
          events.emit('reference:deleted', { id, graphId: target.graphId });
        }
      });
      events.emit('reference:deleted', { id, graphId: target.graphId });
      return rs.filter(r => r.id !== id);
    });
  }, []);

  const updateReferenceLabel = useCallback((id: string, label: string) => {
    setReferences(rs => rs.map(r => {
      if (r.id !== id) return r;
      const prev = r.label || '';
      const nextLabel = label.slice(0,255);
      if (prev === nextLabel) return r;
      pushUndo({
        type: 'reference-label',
        undo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, label: prev } : rr)),
        redo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, label: nextLabel } : rr))
      });
      events.emit('reference:labelChanged', { id, label: nextLabel });
  const updated = { ...r, label: nextLabel, lastModified: new Date().toISOString() };
  void saveReferences(r.graphId, [updated]);
  return updated;
    }));
  }, []);

  const toggleReferenceLabelVisibility = useCallback((id: string, hidden: boolean) => {
    setReferences(rs => rs.map(r => {
      if (r.id !== id) return r;
      if (!!r.labelHidden === hidden) return r;
      const prev = !!r.labelHidden;
      pushUndo({
        type: 'reference-label-visibility',
        undo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, labelHidden: prev } : rr)),
        redo: () => setReferences(inner => inner.map(rr => rr.id === id ? { ...rr, labelHidden: hidden } : rr))
      });
      events.emit('reference:labelVisibilityChanged', { id, hidden });
  const updated = { ...r, labelHidden: hidden, lastModified: new Date().toISOString() };
  void saveReferences(r.graphId, [updated]);
  return updated;
    }));
  }, []);

  // MISSING CORE FUNCTIONS RE-INSERTED
  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    if (!graph) return;
    const prev = nodes.find(n => n.id === nodeId);
    if (!prev) return;
    const prevX = prev.x; const prevY = prev.y;
    const nextX = Math.round(x); const nextY = Math.round(y);
    if (prevX === nextX && prevY === nextY) return;
    let movedLocal: NodeRecord | null = null;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId) { movedLocal = { ...n, x: nextX, y: nextY, lastModified: new Date().toISOString() }; return movedLocal; }
      return n;
    }));
    if (movedLocal) {
      const moved = movedLocal as NodeRecord;
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
    updateGraphMeta(graph.id, { viewport: { x, y, zoom } }).catch(()=>{});
  }, [graph]);

  const setNodePositionEphemeral = useCallback((nodeId: string, x: number, y: number) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, x: Math.round(x), y: Math.round(y) } : n));
  }, [graph]);

  const startEditing = useCallback((nodeId: string) => { setEditingNodeId(nodeId); }, []);
  const stopEditing = useCallback(() => { setEditingNodeId(null); }, []);
  const selectNode = useCallback((id: string | null) => {
    setSelectedReferenceId(null);
    setSelectedNodeId(id);
    if (id) {
      setSelectedNodeIds([id]);
    } else {
      setSelectedNodeIds([]);
    }
  }, []);

  // ===== Multi-select mutators (initial implementation T002) =====
  const replaceSelection = useCallback((ids: string[]) => {
    const dedup: string[] = [];
    for (const id of ids) { if (id && !dedup.includes(id)) dedup.push(id); }
    setSelectedReferenceId(null);
    setSelectedNodeIds(dedup);
    setSelectedNodeId(dedup.length === 1 ? dedup[0] : null);
  }, []);

  const addToSelection = useCallback((ids: string[]) => {
    setSelectedReferenceId(null);
    setSelectedNodeIds(cur => {
      const next = [...cur];
      for (const id of ids) { if (id && !next.includes(id)) next.push(id); }
      // Single selection compatibility update
      if (next.length === 1) setSelectedNodeId(next[0]); else setSelectedNodeId(null);
      return next;
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    if (!id) return;
    setSelectedReferenceId(null);
    setSelectedNodeIds(cur => {
      let next: string[];
      if (cur.includes(id)) {
        next = cur.filter(x => x !== id);
      } else {
        next = [...cur, id];
      }
      if (next.length === 1) setSelectedNodeId(next[0]); else if (next.length === 0) setSelectedNodeId(null); else setSelectedNodeId(null);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
  }, []);

  // ===== Library selection (Map Library view) =====
  const replaceLibrarySelection = useCallback((ids: string[]) => {
    setSelectedLibraryIds(cur => {
      const next = normalizeLibrarySelection(ids);
      if (next.length === cur.length && next.every((val, idx) => val === cur[idx])) {
        return cur;
      }
      return next;
    });
  }, [normalizeLibrarySelection]);

  const addLibrarySelection = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setSelectedLibraryIds(cur => {
      const next = normalizeLibrarySelection([...cur, ...ids]);
      if (next.length === cur.length && next.every((val, idx) => val === cur[idx])) {
        return cur;
      }
      return next;
    });
  }, [normalizeLibrarySelection]);

  const toggleLibrarySelection = useCallback((id: string) => {
    if (!id) return;
    setSelectedLibraryIds(cur => {
      if (cur.includes(id)) {
        const next = cur.filter(existing => existing !== id);
        return next.length === cur.length ? cur : next;
      }
      const next = normalizeLibrarySelection([...cur, id]);
      if (next.length === cur.length && next.every((val, idx) => val === cur[idx])) {
        return cur;
      }
      return next;
    });
  }, [normalizeLibrarySelection]);

  const clearLibrarySelection = useCallback(() => {
    setSelectedLibraryIds(cur => (cur.length ? [] : cur));
  }, []);

  const exportMaps = useCallback(async (ids: string[], options?: ExportMapsOptions): Promise<ExportArchiveResult> => {
    const normalized = normalizeLibrarySelection(ids);
    if (!normalized.length) {
      throw new Error('Select at least one map to export.');
    }
    const snapshots = await getGraphSnapshots(normalized);
    if (snapshots.length !== normalized.length) {
      throw new Error('Unable to load one or more maps for export.');
    }
    return generateExportArchive(snapshots, {
      appVersion: APP_VERSION,
      manifestVersion: EXPORT_MANIFEST_VERSION,
      notes: options?.notes,
      fileName: options?.fileName,
      signal: options?.signal,
      pauseAutosave: options?.pauseAutosave,
      resumeAutosave: options?.resumeAutosave,
      logger: options?.logger,
    });
  }, [normalizeLibrarySelection]);

  // ===== Marquee (ephemeral) =====
  const beginMarquee = useCallback((x: number, y: number, additive: boolean) => {
    setMarquee({ active: false, startX: x, startY: y, currentX: x, currentY: y, additive });
  }, []);
  const updateMarquee = useCallback((x: number, y: number) => {
    setMarquee(m => m ? { ...m, currentX: x, currentY: y } : m);
  }, []);
  const activateMarquee = useCallback(() => {
    setMarquee(m => m && !m.active ? { ...m, active: true } : m);
  }, []);
  const endMarquee = useCallback(() => {
    let result: { startX: number; startY: number; endX: number; endY: number; additive: boolean } | null = null;
    setMarquee(m => {
      if (!m) return null;
      if (!m.active) return null; // never activated beyond threshold
      result = { startX: m.startX, startY: m.startY, endX: m.currentX, endY: m.currentY, additive: m.additive };
      return null;
    });
    return result;
  }, []);
  const cancelMarquee = useCallback(() => { setMarquee(null); }, []);
  const setInteractionModeCb = useCallback((mode: 'grab' | 'select') => { setInteractionMode(mode); }, []);
  const selectReference = useCallback((id: string | null) => { setSelectedNodeId(null); setSelectedReferenceId(id); }, []);

  const activateTool = useCallback((tool: 'note' | 'rect') => {
    setActiveTool(prev => {
      if (prev === tool) return prev;
      events.emit('toolbar:toolActivated', { tool });
      return tool;
    });
  }, []);

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
    // Annotation nodes get depth=0 mapping (no parent semantics yet)
    const mapping = computeInitialBorderColour(0, BORDER_COLOUR_PALETTE);
    rec.originalBorderColour = mapping.colour;
    rec.currentBorderColour = mapping.colour;
    rec.borderPaletteIndex = mapping.index;
    rec.borderOverrideFlag = false;
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

  const resizeRectangle = useCallback((nodeId: string, width: number, height: number, gesture?: { prevWidth: number; prevHeight: number; prevX: number; prevY: number; newX?: number; newY?: number }) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId && (n.nodeKind === 'rect' || n.nodeKind === 'note')) {
        const w = Math.max(40, Math.round(width));
        const h = Math.max(40, Math.round(height));
        const nextX = gesture?.newX !== undefined ? Math.round(gesture.newX) : n.x;
        const nextY = gesture?.newY !== undefined ? Math.round(gesture.newY) : n.y;
        if (n.width === w && n.height === h && n.x === nextX && n.y === nextY) return n;
        const updated: NodeRecord = { ...n, width: w, height: h, x: nextX, y: nextY, lastModified: new Date().toISOString() };
        void saveNodes(graph.id!, [updated]);
        events.emit('node:resized', { nodeId, width: w, height: h, prevWidth: n.width ?? 120, prevHeight: n.height ?? 60 });
        const prevW = gesture?.prevWidth ?? (n.width ?? 120);
        const prevH = gesture?.prevHeight ?? (n.height ?? 60);
        const prevX = gesture?.prevX ?? n.x;
        const prevY = gesture?.prevY ?? n.y;
        if (!gesture || (prevW === w && prevH === h && prevX === nextX && prevY === nextY)) {
          return updated;
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

  const resizeRectangleEphemeral = useCallback((nodeId: string, width: number, height: number, x: number, y: number) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
      if (n.id === nodeId && (n.nodeKind === 'rect' || n.nodeKind === 'note')) {
        const w = Math.max(40, Math.round(width));
        const h = Math.max(40, Math.round(height));
        if (n.width === w && n.height === h && n.x === Math.round(x) && n.y === Math.round(y)) return n;
        return { ...n, width: w, height: h, x: Math.round(x), y: Math.round(y) } as NodeRecord;
      }
      return n;
    }));
  }, [graph]);

  const updateEdgeHandles = useCallback((edgeId: string, sourceHandleId?: string | null, targetHandleId?: string | null) => {
    if (!graph) return;
    setEdges(es => es.map(e => {
      if (e.id !== edgeId) return e;
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

  const cloneCurrent = useCallback(async () => {
    if (!graph) return;
    const g = await cloneGraph(graph.id);
    if (!g) return;
    const snap = await loadGraph(g.id);
    if (snap) {
      resetUndoHistory();
      setGraph(snap.graph);
      setNodes(snap.nodes);
      setEdges(snap.edges);
      setReferences(snap.references || []);
      mutationCounter.current++;
      await refreshList();
      setView('canvas');
      setSelectedNodeId(null);
    }
  }, [graph]);

  const deleteNode = useCallback((nodeId: string) => {
    if (!graph) return;
    const rootId = (() => {
      let earliest: NodeRecord | null = null;
      for (const n of nodes) { if (!earliest || n.created < earliest.created) earliest = n; }
      return earliest?.id || null;
    })();
    if (nodeId === rootId) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const adjacency = new Map<string, Set<string>>();
    function link(a: string, b: string) { (adjacency.get(a) || adjacency.set(a, new Set()).get(a)!).add(b); }
    for (const e of edges) { link(e.sourceNodeId, e.targetNodeId); link(e.targetNodeId, e.sourceNodeId); }
    const level = levels;
    const nodeLevel = level.get(nodeId);
    if (nodeLevel === undefined) {
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
    const neighbors = Array.from(adjacency.get(nodeId) || []);
    const parentCandidates = neighbors.filter(n => (level.get(n) ?? Infinity) < nodeLevel);
    let parentId: string | null = null;
    if (parentCandidates.length) {
      parentId = parentCandidates.reduce((best, cur) => {
        if (!best) return cur;
        const lb = level.get(best)!; const lc = level.get(cur)!;
        if (lc < lb) return cur;
        if (lc > lb) return best;
        const nb = nodes.find(n => n.id === best)!; const nc = nodes.find(n => n.id === cur)!;
        if (nc.created < nb.created) return cur;
        return best;
      }, '' as string);
    }
    if (!parentId) {
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
    const childIds = neighbors.filter(n => level.get(n) === nodeLevel + 1);
    const incidentEdgeIds = new Set<string>();
    const remainingEdges: EdgeRecord[] = [];
    for (const e of edges) {
      if (e.sourceNodeId === nodeId || e.targetNodeId === nodeId) { incidentEdgeIds.add(e.id); continue; }
      remainingEdges.push(e);
    }
    const newEdges: EdgeRecord[] = [];
    function hasEdge(a: string, b: string) { return remainingEdges.some(e => (e.sourceNodeId === a && e.targetNodeId === b) || (e.sourceNodeId === b && e.targetNodeId === a)); }
    for (const childId of childIds) {
      if (childId === parentId) continue;
      if (hasEdge(parentId, childId)) continue;
      try {
        const parentNode = nodes.find(n => n.id === parentId);
        const childNode = nodes.find(n => n.id === childId);
        let sourceHandleId: string | undefined; let targetHandleId: string | undefined;
        if (parentNode && childNode) {
          const APPROX_W = 100; const APPROX_H = 38;
          const px = parentNode.x + APPROX_W / 2; const py = parentNode.y + APPROX_H / 2;
          const cx = childNode.x + APPROX_W / 2; const cy = childNode.y + APPROX_H / 2;
          const dx = cx - px; const dy = cy - py;
          const adx = Math.abs(dx); const ady = Math.abs(dy);
          if (ady >= adx) { if (dy < 0) { sourceHandleId = 'n'; targetHandleId = 's'; } else { sourceHandleId = 's'; targetHandleId = 'n'; } }
          else { if (dx > 0) { sourceHandleId = 'e'; targetHandleId = 'w'; } else { sourceHandleId = 'w'; targetHandleId = 'e'; } }
        }
        const e = createEdge({ graphId: graph.id, sourceNodeId: parentId, targetNodeId: childId, sourceHandleId, targetHandleId });
        newEdges.push(e);
      } catch { /* ignore */ }
    }
    const nodeSnapshot = { ...node } as NodeRecord;
    const removedEdgesFull = edges.filter(e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => [...remainingEdges, ...newEdges]);
    mutationCounter.current++;
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (editingNodeId === nodeId) setEditingNodeId(null);
    events.emit('node:deleted', { graphId: graph.id, nodeId });
    const sortedNew = [...newEdges].sort((a, b) => a.targetNodeId.localeCompare(b.targetNodeId));
    for (const e of sortedNew) { events.emit('edge:created', { graphId: graph.id, edgeId: e.id }); }
    const removedEdgeIds = Array.from(incidentEdgeIds);
    void persistNodeDeletion(graph.id, nodeId, removedEdgeIds, newEdges);
    pushUndo({
      type: 'delete',
      undo: () => {
        setNodes(ns => [...ns, nodeSnapshot]);
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
        setNodes(ns => ns.filter(n => n.id !== nodeSnapshot.id));
        setEdges(es => {
          const woOriginal = es.filter(e => !removedEdgesFull.some(r => r.id === e.id));
          const missing = newEdges.filter(ne => !woOriginal.some(e => e.id === ne.id));
          return [...woOriginal, ...missing];
        });
        void persistNodeDeletion(graph.id!, nodeSnapshot.id, removedEdgesFull.map(e=>e.id), newEdges);
        events.emit('node:deleted', { graphId: graph.id!, nodeId: nodeSnapshot.id });
        newEdges.forEach(e => events.emit('edge:created', { graphId: graph.id!, edgeId: e.id }));
      }
    });
  }, [graph, nodes, edges, levels, selectedNodeId, editingNodeId]);

  // Border override actions (pure state updates + undo integration)
  const overrideNodeBorder = useCallback((nodeId: string, hex: string) => {
    if (!graph) return;
    // Accept 6-digit or 8-digit hex to match palette entries (alpha allowed)
    const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
    if (!HEX_RE.test(hex)) return; // silently ignore invalid
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n;
      const prev = { ...n } as NodeRecord;
      const updated: NodeRecord = { ...n, borderOverrideFlag: true, borderOverrideColour: hex, currentBorderColour: hex, lastModified: new Date().toISOString() };
      void saveNodes(graph.id!, [updated]);
      pushUndo({
        type: 'border-override',
        undo: () => {
          setNodes(cur => cur.map(cn => cn.id === nodeId ? prev : cn));
          void saveNodes(graph.id!, [prev]);
        },
        redo: () => {
          setNodes(cur => cur.map(cn => cn.id === nodeId ? updated : cn));
          void saveNodes(graph.id!, [updated]);
        }
      });
      return updated;
    }));
  }, [graph]);

  const clearNodeBorderOverride = useCallback((nodeId: string) => {
    if (!graph) return;
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n;
      if (!n.borderOverrideFlag) return n;
      const prev = { ...n } as NodeRecord;
      const fallback = n.originalBorderColour || ROOT_FALLBACK;
      const updated: NodeRecord = { ...n, borderOverrideFlag: false, borderOverrideColour: undefined, currentBorderColour: fallback, lastModified: new Date().toISOString() };
      void saveNodes(graph.id!, [updated]);
      pushUndo({
        type: 'border-override-clear',
        undo: () => {
          setNodes(cur => cur.map(cn => cn.id === nodeId ? prev : cn));
          void saveNodes(graph.id!, [prev]);
        },
        redo: () => {
          setNodes(cur => cur.map(cn => cn.id === nodeId ? updated : cn));
          void saveNodes(graph.id!, [updated]);
        }
      });
      return updated;
    }));
  }, [graph]);

  const getNodeBorderInfo = useCallback((nodeId: string) => {
    const n = nodes.find(nn => nn.id === nodeId);
    if (!n) return null;
    const colour = n.currentBorderColour || n.originalBorderColour || ROOT_FALLBACK;
    const original = n.originalBorderColour || colour;
    return { colour, overridden: !!n.borderOverrideFlag, original };
  }, [nodes]);

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

  useEffect(() => {
    setSelectedLibraryIds(cur => normalizeLibrarySelection(cur));
  }, [normalizeLibrarySelection]);


  React.useEffect(() => { refreshList(); }, []);

  return <Ctx.Provider value={{ graph, nodes, edges, graphs, view, references, newGraph, selectGraph, openLibrary, renameGraph, removeGraph, addNode, addEdge, addConnectedNode, updateNodeText, updateNodeColors, updateNodeZOrder, updateNoteAlignment, moveNode, updateViewport, setNodePositionEphemeral, deleteNode, cloneCurrent, editingNodeId, startEditing, stopEditing, pendingChanges, selectedNodeId, selectNode, selectedReferenceId, selectReference, selectedNodeIds, replaceSelection, addToSelection, toggleSelection, clearSelection, selectedLibraryIds, replaceLibrarySelection, addLibrarySelection, toggleLibrarySelection, clearLibrarySelection, exportMaps, marquee, beginMarquee, updateMarquee, endMarquee, cancelMarquee, activateMarquee, interactionMode, setInteractionMode: setInteractionModeCb, levels, activeTool, activateTool, toggleTool, addAnnotation, resizeRectangle, resizeRectangleEphemeral, updateEdgeHandles, updateNoteFormatting, resetNoteFormatting, createReference, updateReferenceStyle, repositionReference, deleteReference, updateReferenceLabel, toggleReferenceLabelVisibility, overrideNodeBorder, clearNodeBorderOverride, getNodeBorderInfo, importContext, stageImport, resolveImportConflict, finalizeImportSession, clearImportSession }}>{children}</Ctx.Provider>;
};

export function useGraph() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('GraphProvider missing');
  return ctx;
}

// Minimal headless test store factory for TDD (used by selection-state tests)
// NOTE: This intentionally does not replicate full GraphProvider functionality.
export function createGraphStore() {
  const state = {
    selectedNodeIds: [] as string[],
    marquee: null as any,
    replaceSelection(ids: string[]) {
      const dedup: string[] = [];
      for (const id of ids) { if (id && !dedup.includes(id)) dedup.push(id); }
      state.selectedNodeIds = dedup;
    },
    addToSelection(ids: string[]) {
      for (const id of ids) { if (id && !state.selectedNodeIds.includes(id)) state.selectedNodeIds.push(id); }
    },
    toggleSelection(id: string) {
      if (!id) return;
      if (state.selectedNodeIds.includes(id)) state.selectedNodeIds = state.selectedNodeIds.filter(x => x !== id);
      else state.selectedNodeIds.push(id);
    },
    clearSelection() { state.selectedNodeIds = []; }
    , beginMarquee(x: number, y: number, additive: boolean) { state.marquee = { active: false, startX: x, startY: y, currentX: x, currentY: y, additive }; }
    , updateMarquee(x: number, y: number) { if (state.marquee) { state.marquee.currentX = x; state.marquee.currentY = y; } }
    , endMarquee() { if (!state.marquee || !state.marquee.active) { state.marquee = null; return null; } const r = { startX: state.marquee.startX, startY: state.marquee.startY, endX: state.marquee.currentX, endY: state.marquee.currentY, additive: state.marquee.additive }; state.marquee = null; return r; }
    , cancelMarquee() { state.marquee = null; }
  };
  return {
    getState() { return state; }
  };
}
