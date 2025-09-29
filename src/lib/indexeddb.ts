import { openDB, IDBPDatabase } from 'idb';
import { GraphRecord, NodeRecord, EdgeRecord, PersistenceSnapshot } from './types';

const DB_NAME = 'mindflow';
const DB_VERSION = 1;

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
    settings: { autoLoadLast: opts?.autoLoadLast ?? true }
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
  // Sort according to serialization contract
  nodes.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  edges.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  return { graph, nodes, edges };
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

export async function deleteGraph(graphId: string) {
  const db = await initDB();
  const tx = db.transaction(['graphs','graphNodes','graphEdges'], 'readwrite');
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
  await tx.done;
}

async function* iterateCursor(index: any, key: IDBValidKey) {
  let cursor = await index.openCursor(key);
  while (cursor) {
    yield cursor;
    cursor = await cursor.continue();
  }
}

export async function updateGraphMeta(graphId: string, patch: Partial<Pick<GraphRecord,'name'|'settings'>>) {
  const db = await initDB();
  const graph = await db.get('graphs', graphId) as GraphRecord | undefined;
  if (!graph) return;
  if (patch.name) graph.name = patch.name.slice(0,80);
  if (patch.settings) graph.settings = { ...graph.settings, ...patch.settings };
  graph.lastModified = nowIso();
  await db.put('graphs', graph);
}
