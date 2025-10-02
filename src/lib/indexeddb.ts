import { openDB, IDBPDatabase } from 'idb';
import { GraphRecord, NodeRecord, EdgeRecord, PersistenceSnapshot, ReferenceConnectionRecord } from './types';

const DB_NAME = 'mindflow';
// Bump version to add references store (Feature 005)
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function nowIso() { return new Date().toISOString(); }

export function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'mf-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function initDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('graphs')) {
          const store = db.createObjectStore('graphs', { keyPath: 'id' });
          store.createIndex('lastModified', 'lastModified');
          store.createIndex('lastOpened', 'lastOpened');
        }
        if (!db.objectStoreNames.contains('graphNodes')) {
          const store = db.createObjectStore('graphNodes', { keyPath: ['graphId','id'] });
          store.createIndex('graphId', 'graphId');
          store.createIndex('lastModified', 'lastModified');
        }
        if (!db.objectStoreNames.contains('graphEdges')) {
          const store = db.createObjectStore('graphEdges', { keyPath: ['graphId','id'] });
          store.createIndex('graphId', 'graphId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('graphReferences')) {
          const store = db.createObjectStore('graphReferences', { keyPath: ['graphId','id'] });
          store.createIndex('graphId', 'graphId');
        }
      }
    });
  }
  return dbPromise;
}

export async function createGraph(name: string, opts?: { autoLoadLast?: boolean }): Promise<GraphRecord> {
  const db = await initDB();
  const ts = nowIso();
  const record: GraphRecord = {
    id: generateId(),
    name: name.slice(0, 80),
    created: ts,
    lastModified: ts,
    lastOpened: ts,
    schemaVersion: 1,
    settings: { autoLoadLast: opts?.autoLoadLast ?? true },
    viewport: { x: 0, y: 0, zoom: 1 }
  };
  await db.put('graphs', record);
  return record;
}

export async function listGraphs(): Promise<GraphRecord[]> {
  const db = await initDB();
  const tx = db.transaction('graphs');
  const store = tx.objectStore('graphs');
  const all: GraphRecord[] = await store.getAll();
  return all.sort((a,b) => b.lastModified.localeCompare(a.lastModified));
}

export async function loadGraph(graphId: string): Promise<PersistenceSnapshot | null> {
  const db = await initDB();
  const graph = await db.get('graphs', graphId);
  if (!graph) return null;
  graph.lastOpened = nowIso();
  await db.put('graphs', graph);
  const nodes = await db.getAllFromIndex('graphNodes','graphId', graphId);
  const edges = await db.getAllFromIndex('graphEdges','graphId', graphId);
  let references: ReferenceConnectionRecord[] = [];
  if (db.objectStoreNames.contains('graphReferences')) {
    references = await db.getAllFromIndex('graphReferences','graphId', graphId) as ReferenceConnectionRecord[];
    references.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  }
  // Migration / default injection for Feature 004 rich note fields
  // We do this in-memory to avoid eager writes; persistence occurs on first save.
  for (const n of nodes as NodeRecord[]) {
    if (n.nodeKind === 'note') {
      // Provide defaults only if undefined to preserve existing explicit values
      if (n.fontSize == null) n.fontSize = 14;
      if (!n.fontFamily) n.fontFamily = 'Inter';
      if (n.fontWeight == null) n.fontWeight = 'normal';
      if (n.italic == null) n.italic = false;
      if (n.underline == null) n.underline = false; // reserved future toggle
      if (n.highlight == null) n.highlight = false;
      if (n.backgroundOpacity == null) n.backgroundOpacity = 100;
      if (!n.overflowMode) n.overflowMode = 'auto-resize';
      if (n.hideShapeWhenUnselected == null) n.hideShapeWhenUnselected = false;
      if (n.maxHeight == null) n.maxHeight = 280; // vertical auto-resize ceiling
      // maxWidth intentionally omitted v1 (manual width wins)
    }
  }
  // Sort according to serialization contract
  nodes.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  edges.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  return { graph, nodes, edges, references };
}

export async function saveNodes(graphId: string, upserts: NodeRecord[]) {
  const db = await initDB();
  const tx = db.transaction(['graphNodes','graphs'], 'readwrite');
  const nodesStore = tx.objectStore('graphNodes');
  for (const n of upserts) {
    if (n.graphId !== graphId) throw new Error('graphId mismatch');
    if (n.text.length > 255) throw new Error('text length >255');
    await nodesStore.put(n);
  }
  const graph = await tx.objectStore('graphs').get(graphId) as GraphRecord | undefined;
  if (graph) {
    graph.lastModified = nowIso();
    await tx.objectStore('graphs').put(graph);
  }
  await tx.done;
}

export async function saveEdges(graphId: string, upserts: EdgeRecord[]) {
  const db = await initDB();
  const tx = db.transaction(['graphEdges','graphs'], 'readwrite');
  const store = tx.objectStore('graphEdges');
  for (const e of upserts) {
    if (e.graphId !== graphId) throw new Error('graphId mismatch');
    await store.put(e);
  }
  const graph = await tx.objectStore('graphs').get(graphId) as GraphRecord | undefined;
  if (graph) {
    graph.lastModified = nowIso();
    await tx.objectStore('graphs').put(graph);
  }
  await tx.done;
}

export async function saveReferences(graphId: string, upserts: ReferenceConnectionRecord[]) {
  const db = await initDB();
  if (!db.objectStoreNames.contains('graphReferences')) return; // backward compatibility (pre-upgrade)
  const tx = db.transaction(['graphReferences','graphs'], 'readwrite');
  const store = tx.objectStore('graphReferences');
  for (const r of upserts) {
    if (r.graphId !== graphId) throw new Error('graphId mismatch');
    if (r.label && r.label.length > 255) throw new Error('label length >255');
    await store.put(r);
  }
  const graph = await tx.objectStore('graphs').get(graphId) as GraphRecord | undefined;
  if (graph) {
    graph.lastModified = nowIso();
    await tx.objectStore('graphs').put(graph);
  }
  await tx.done;
}

export async function deleteReferences(graphId: string, ids: string[]) {
  if (!ids.length) return;
  const db = await initDB();
  if (!db.objectStoreNames.contains('graphReferences')) return; // backward compatibility
  const tx = db.transaction(['graphReferences','graphs'], 'readwrite');
  const store = tx.objectStore('graphReferences');
  for (const id of ids) {
    // graphReferences uses composite key [graphId, id]
    await store.delete([graphId, id]);
  }
  const graph = await tx.objectStore('graphs').get(graphId) as GraphRecord | undefined;
  if (graph) {
    graph.lastModified = nowIso();
    await tx.objectStore('graphs').put(graph);
  }
  await tx.done;
}

export async function deleteGraph(graphId: string) {
  const db = await initDB();
  const stores: any[] = ['graphs','graphNodes','graphEdges'];
  if (db.objectStoreNames.contains('graphReferences')) stores.push('graphReferences');
  const tx = db.transaction(stores, 'readwrite');
  await tx.objectStore('graphs').delete(graphId);
  // Delete nodes
  const nodeIndex = tx.objectStore('graphNodes').index('graphId');
  for await (const cursor of iterateCursor(nodeIndex, graphId)) {
    await cursor.delete();
  }
  const edgeIndex = tx.objectStore('graphEdges').index('graphId');
  for await (const cursor of iterateCursor(edgeIndex, graphId)) {
    await cursor.delete();
  }
  if (db.objectStoreNames.contains('graphReferences')) {
    const refIndex = tx.objectStore('graphReferences').index('graphId');
    for await (const cursor of iterateCursor(refIndex, graphId)) {
      await cursor.delete();
    }
  }
  await tx.done;
}

async function* iterateCursor(index: any, key: IDBValidKey) {
  let cursor = await index.openCursor(key);
  while (cursor) {
    yield cursor;
    cursor = await cursor.continue();
  }
}

export async function updateGraphMeta(graphId: string, patch: Partial<Pick<GraphRecord,'name'|'settings'|'viewport'>>) {
  const db = await initDB();
  const graph = await db.get('graphs', graphId) as GraphRecord | undefined;
  if (!graph) return;
  if (patch.name) graph.name = patch.name.slice(0,80);
  if (patch.settings) graph.settings = { ...graph.settings, ...patch.settings };
  if (patch.viewport) graph.viewport = { ...graph.viewport, ...patch.viewport } as any;
  graph.lastModified = nowIso();
  await db.put('graphs', graph);
}

export async function cloneGraph(sourceGraphId: string): Promise<GraphRecord | null> {
  const db = await initDB();
  const snap = await loadGraph(sourceGraphId);
  if (!snap) return null;
  const existing = await listGraphs();
  const base = snap.graph.name;
  let i = 1; let candidate = `${base}Clone${i}`;
  const names = new Set(existing.map(g => g.name));
  while (names.has(candidate)) { i++; candidate = `${base}Clone${i}`; }
  const ts = nowIso();
  const newGraph: GraphRecord = {
    id: generateId(),
    name: candidate.slice(0,80),
    created: ts,
    lastModified: ts,
    lastOpened: ts,
    schemaVersion: snap.graph.schemaVersion,
    settings: { ...snap.graph.settings },
    viewport: snap.graph.viewport ? { ...snap.graph.viewport } : { x:0, y:0, zoom:1 }
  };
  // Build node id map
  const idMap = new Map<string,string>();
  const newNodes = snap.nodes.map(n => {
    const nid = generateId(); idMap.set(n.id, nid);
    const nn: NodeRecord = { ...n, id: nid, graphId: newGraph.id, created: n.created, lastModified: n.lastModified };
    return nn;
  });
  const newEdges = snap.edges.map(e => {
    const eid = generateId();
    const ne: EdgeRecord = { ...e, id: eid, graphId: newGraph.id, sourceNodeId: idMap.get(e.sourceNodeId)!, targetNodeId: idMap.get(e.targetNodeId)!, created: e.created };
    return ne;
  });
  const newReferences = (snap.references || []).map(r => {
    const rid = generateId();
    const nr: ReferenceConnectionRecord = { ...r, id: rid, graphId: newGraph.id, sourceNodeId: idMap.get(r.sourceNodeId)!, targetNodeId: idMap.get(r.targetNodeId)!, created: r.created, lastModified: r.lastModified };
    return nr;
  });
  const db2 = await initDB();
  const stores: any[] = ['graphs','graphNodes','graphEdges'];
  if (db2.objectStoreNames.contains('graphReferences')) stores.push('graphReferences');
  const tx = db2.transaction(stores, 'readwrite');
  await tx.objectStore('graphs').put(newGraph);
  const nodesStore = tx.objectStore('graphNodes');
  for (const n of newNodes) await nodesStore.put(n);
  const edgesStore = tx.objectStore('graphEdges');
  for (const e of newEdges) await edgesStore.put(e);
  if (db2.objectStoreNames.contains('graphReferences')) {
    const refStore = tx.objectStore('graphReferences');
    for (const r of newReferences) await refStore.put(r);
  }
  await tx.done;
  return newGraph;
}

// Persist helper for FR-043 node deletion + re-parenting.
export async function persistNodeDeletion(
  graphId: string,
  deletedNodeId: string,
  removedEdgeIds: string[],
  newEdges: EdgeRecord[]
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['graphNodes','graphEdges','graphs'], 'readwrite');
  // Delete node
  await tx.objectStore('graphNodes').delete([graphId, deletedNodeId]);
  // Delete removed edges
  const edgesStore = tx.objectStore('graphEdges');
  for (const id of removedEdgeIds) {
    await edgesStore.delete([graphId, id]);
  }
  // Insert new edges (re-parent)
  for (const e of newEdges) {
    if (e.graphId !== graphId) continue;
    await edgesStore.put(e);
  }
  const g = await tx.objectStore('graphs').get(graphId) as GraphRecord | undefined;
  if (g) {
    g.lastModified = nowIso();
    await tx.objectStore('graphs').put(g);
  }
  await tx.done;
}

// Global user settings (key/value) convenience
interface SettingRecord { key: string; value: any }

export async function getSetting<T=unknown>(key: string): Promise<T | undefined> {
  const db = await initDB();
  const rec = await db.get('settings', key) as SettingRecord | undefined;
  return rec?.value as T | undefined;
}

export async function setSetting<T=unknown>(key: string, value: T): Promise<void> {
  const db = await initDB();
  await db.put('settings', { key, value });
}
