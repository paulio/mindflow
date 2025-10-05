import { openDB, IDBPDatabase } from 'idb';
import {
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
  ThumbnailCacheEntrySchema,
  ThumbnailCacheEntryValidationError,
} from './thumbnails';
import type { ThumbnailCacheEntry, ThumbnailStatus, ThumbnailTrigger } from './thumbnails';
import { GraphRecord, NodeRecord, EdgeRecord, PersistenceSnapshot, ReferenceConnectionRecord } from './types';
import { emitThumbnailEvictionEvent } from './events';

const DB_NAME = 'mindflow';
// Bump version to add thumbnail metadata/blob stores (Feature 009)
const DB_VERSION = 3;

const THUMBNAIL_METADATA_STORE = 'thumbnailEntries';
const THUMBNAIL_BLOB_STORE = 'thumbnailBlobs';
export const THUMBNAIL_QUOTA_BYTES = 10 * 1024 * 1024; // 10 MB cap per spec

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
        if (!db.objectStoreNames.contains(THUMBNAIL_METADATA_STORE)) {
          const store = db.createObjectStore(THUMBNAIL_METADATA_STORE, { keyPath: 'mapId' });
          store.createIndex('updatedAt', 'updatedAt');
          store.createIndex('lastAccessed', 'lastAccessed');
        }
        if (!db.objectStoreNames.contains(THUMBNAIL_BLOB_STORE)) {
          db.createObjectStore(THUMBNAIL_BLOB_STORE);
        }
      }
    });
  }
  return dbPromise;
}

function hasThumbnailStores(db: IDBPDatabase): boolean {
  return (
    db.objectStoreNames.contains(THUMBNAIL_METADATA_STORE) &&
    db.objectStoreNames.contains(THUMBNAIL_BLOB_STORE)
  );
}

function assertThumbnailStores(db: IDBPDatabase): void {
  if (!hasThumbnailStores(db)) {
    throw new Error('Thumbnail stores are not initialized; call initDB() after upgrade.');
  }
}

function normalizeThumbnailEntry(raw: unknown): ThumbnailCacheEntry {
  const parsed = ThumbnailCacheEntrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ThumbnailCacheEntryValidationError(parsed.error.issues);
  }
  return parsed.data;
}

function createBlobKey(mapId: string, timestamp: string): string {
  const random = Math.random().toString(36).slice(2);
  return `thumb/${mapId}/${timestamp}/${random}`;
}

function clampRetryCount(value: number | undefined): 0 | 1 {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  return 1;
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

async function hydrateSnapshot(
  graphRecord: GraphRecord,
  nodes: NodeRecord[],
  edges: EdgeRecord[],
  references: ReferenceConnectionRecord[],
): Promise<PersistenceSnapshot> {
  const graphCopy: GraphRecord = { ...graphRecord };
  const nodesCopy = nodes.map(n => ({ ...n })) as NodeRecord[];
  const edgesCopy = edges.map(e => ({ ...e })) as EdgeRecord[];
  const referencesCopy = references.map(r => ({ ...r })) as ReferenceConnectionRecord[];

  // Migration / default injection for Feature 004 rich note fields
  for (const n of nodesCopy) {
    if (n.nodeKind === 'note') {
      if (n.fontSize == null) n.fontSize = 14;
      if (!n.fontFamily) n.fontFamily = 'Inter';
      if (n.fontWeight == null) n.fontWeight = 'normal';
      if (n.italic == null) n.italic = false;
      if (n.underline == null) n.underline = false;
      if (n.highlight == null) n.highlight = false;
      if (n.backgroundOpacity == null) n.backgroundOpacity = 100;
      if (!n.overflowMode) n.overflowMode = 'auto-resize';
      if (n.hideShapeWhenUnselected == null) n.hideShapeWhenUnselected = false;
      if (n.maxHeight == null) n.maxHeight = 280;
    }
  }

  nodesCopy.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  edgesCopy.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));

  if (referencesCopy.length) {
    referencesCopy.sort((a,b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  }

  return {
    graph: graphCopy,
    nodes: nodesCopy,
    edges: edgesCopy,
    references: referencesCopy,
  };
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
  return hydrateSnapshot(graph, nodes as NodeRecord[], edges as EdgeRecord[], references);
}

export async function getGraphSnapshot(graphId: string): Promise<PersistenceSnapshot | null> {
  const db = await initDB();
  const graph = await db.get('graphs', graphId);
  if (!graph) return null;
  const nodes = await db.getAllFromIndex('graphNodes','graphId', graphId) as NodeRecord[];
  const edges = await db.getAllFromIndex('graphEdges','graphId', graphId) as EdgeRecord[];
  let references: ReferenceConnectionRecord[] = [];
  if (db.objectStoreNames.contains('graphReferences')) {
    references = await db.getAllFromIndex('graphReferences','graphId', graphId) as ReferenceConnectionRecord[];
  }
  return hydrateSnapshot(graph, nodes, edges, references);
}

export async function getGraphSnapshots(graphIds: string[]): Promise<PersistenceSnapshot[]> {
  if (!graphIds.length) return [];
  const snapshots: PersistenceSnapshot[] = [];
  for (const id of graphIds) {
    const snap = await getGraphSnapshot(id);
    if (snap) snapshots.push(snap);
  }
  return snapshots;
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

export interface PutThumbnailOptions {
  mapId: string;
  blob: Blob;
  trigger: ThumbnailTrigger;
  sourceExportAt: string;
  status?: ThumbnailStatus;
  failureReason?: string | null;
  retryCount?: number;
  timestampOverride?: string;
  quotaBytes?: number;
}

export interface PutThumbnailResult {
  entry: ThumbnailCacheEntry;
  evicted: ThumbnailCacheEntry[];
  totalBytes: number;
}

export async function putThumbnail(options: PutThumbnailOptions): Promise<PutThumbnailResult> {
  const db = await initDB();
  assertThumbnailStores(db);

  const now = options.timestampOverride ?? nowIso();
  const blobKey = createBlobKey(options.mapId, now);
  const status: ThumbnailStatus = options.status ?? 'ready';
  const normalizedFailureReason = status === 'failed'
    ? (options.failureReason && options.failureReason.trim().length > 0
      ? options.failureReason
      : 'unknown-thumbnail-failure')
    : null;
  const entry: ThumbnailCacheEntry = {
    mapId: options.mapId,
    status,
    blobKey,
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    byteSize: options.blob.size ?? 0,
    updatedAt: now,
    lastAccessed: now,
    sourceExportAt: options.sourceExportAt,
    trigger: options.trigger,
    retryCount: clampRetryCount(options.retryCount),
    failureReason: normalizedFailureReason,
  };

  // Validate prior to writes to avoid partially persisted blobs.
  const parsedEntry = ThumbnailCacheEntrySchema.parse(entry);

  const tx = db.transaction([THUMBNAIL_METADATA_STORE, THUMBNAIL_BLOB_STORE], 'readwrite');
  const metadataStore = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const blobStore = tx.objectStore(THUMBNAIL_BLOB_STORE);

  const existingRaw = await metadataStore.get(options.mapId);
  if (existingRaw) {
    try {
      const existing = normalizeThumbnailEntry(existingRaw);
      await blobStore.delete(existing.blobKey);
    } catch {
      // If validation fails, remove the corrupted record to avoid future issues.
      await metadataStore.delete(options.mapId);
    }
  }

  await blobStore.put(options.blob, blobKey);
  await metadataStore.put(parsedEntry);
  await tx.done;

  const { removed: evicted, totalBytes } = await trimThumbnailsToQuota(
    options.quotaBytes ?? THUMBNAIL_QUOTA_BYTES,
    db,
  );

  return { entry: parsedEntry, evicted, totalBytes };
}

export async function getThumbnailEntry(mapId: string): Promise<ThumbnailCacheEntry | null> {
  const db = await initDB();
  if (!hasThumbnailStores(db)) return null;
  const tx = db.transaction(THUMBNAIL_METADATA_STORE, 'readonly');
  const store = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const raw = await store.get(mapId);
  await tx.done;
  if (!raw) return null;
  try {
    return normalizeThumbnailEntry(raw);
  } catch {
    // Remove the invalid record to unblock future writes.
    const writeTx = db.transaction(THUMBNAIL_METADATA_STORE, 'readwrite');
    await writeTx.objectStore(THUMBNAIL_METADATA_STORE).delete(mapId);
    await writeTx.done;
    return null;
  }
}

export async function touchThumbnail(mapId: string, accessedAt?: string): Promise<ThumbnailCacheEntry | null> {
  const db = await initDB();
  if (!hasThumbnailStores(db)) return null;
  const tx = db.transaction(THUMBNAIL_METADATA_STORE, 'readwrite');
  const store = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const raw = await store.get(mapId);
  if (!raw) {
    await tx.done;
    return null;
  }

  try {
    const entry = normalizeThumbnailEntry(raw);
    const updated: ThumbnailCacheEntry = {
      ...entry,
      lastAccessed: accessedAt ?? nowIso(),
    };
    const parsed = ThumbnailCacheEntrySchema.parse(updated);
    await store.put(parsed);
    await tx.done;
    return parsed;
  } catch {
    await store.delete(mapId);
    await tx.done;
    return null;
  }
}

export async function incrementThumbnailRetry(
  mapId: string,
  failureReason?: string | null,
): Promise<ThumbnailCacheEntry | null> {
  const db = await initDB();
  if (!hasThumbnailStores(db)) return null;
  const tx = db.transaction(THUMBNAIL_METADATA_STORE, 'readwrite');
  const store = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const raw = await store.get(mapId);
  if (!raw) {
    await tx.done;
    return null;
  }

  try {
    const entry = normalizeThumbnailEntry(raw);
    const nextRetryCount = clampRetryCount(entry.retryCount + 1);
    let nextStatus = entry.status;
    let nextFailureReason = failureReason ?? entry.failureReason;
    if (failureReason && failureReason.trim().length > 0) {
      nextStatus = 'failed';
      nextFailureReason = failureReason;
    }
    if (nextStatus === 'failed' && (!nextFailureReason || nextFailureReason.trim().length === 0)) {
      nextFailureReason = 'unknown-thumbnail-failure';
    }
    const updated: ThumbnailCacheEntry = {
      ...entry,
      retryCount: nextRetryCount,
      updatedAt: nowIso(),
      failureReason: nextFailureReason,
      status: nextStatus,
    };
    const parsed = ThumbnailCacheEntrySchema.parse(updated);
    await store.put(parsed);
    await tx.done;
    return parsed;
  } catch {
    await store.delete(mapId);
    await tx.done;
    return null;
  }
}

export interface TrimThumbnailsResult {
  removed: ThumbnailCacheEntry[];
  totalBytes: number;
}

export async function trimThumbnailsToQuota(
  quotaBytes: number = THUMBNAIL_QUOTA_BYTES,
  providedDb?: IDBPDatabase,
): Promise<TrimThumbnailsResult> {
  const db = providedDb ?? await initDB();
  if (!hasThumbnailStores(db)) {
    return { removed: [], totalBytes: 0 };
  }

  const tx = db.transaction([THUMBNAIL_METADATA_STORE, THUMBNAIL_BLOB_STORE], 'readwrite');
  const metadataStore = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const blobStore = tx.objectStore(THUMBNAIL_BLOB_STORE);

  const rawEntries = await metadataStore.getAll();
  const validEntries: ThumbnailCacheEntry[] = [];

  for (const raw of rawEntries) {
    try {
      validEntries.push(normalizeThumbnailEntry(raw));
    } catch {
      if (raw && typeof raw === 'object' && 'mapId' in (raw as Record<string, unknown>)) {
        const key = (raw as Record<string, unknown>).mapId as IDBValidKey;
        await metadataStore.delete(key);
      }
    }
  }

  let totalBytes = validEntries.reduce((sum, entry) => sum + entry.byteSize, 0);
  if (totalBytes <= quotaBytes) {
    await tx.done;
    return { removed: [], totalBytes };
  }

  validEntries.sort((a, b) => {
    const timeCompare = a.updatedAt.localeCompare(b.updatedAt);
    if (timeCompare !== 0) return timeCompare;
    return a.mapId.localeCompare(b.mapId);
  });

  const removed: ThumbnailCacheEntry[] = [];

  for (const entry of validEntries) {
    if (totalBytes <= quotaBytes) break;
    await metadataStore.delete(entry.mapId);
    await blobStore.delete(entry.blobKey);
    totalBytes -= entry.byteSize;
    removed.push(entry);
  }

  await tx.done;

  if (removed.length) {
    emitThumbnailEvictionEvent({ evicted: removed, totalBytes, quotaBytes });
  }

  return { removed, totalBytes };
}

export async function listThumbnailEntries(): Promise<ThumbnailCacheEntry[]> {
  const db = await initDB();
  if (!hasThumbnailStores(db)) return [];

  const tx = db.transaction(THUMBNAIL_METADATA_STORE, 'readonly');
  const store = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const rawEntries = await store.getAll();
  await tx.done;

  const entries: ThumbnailCacheEntry[] = [];
  for (const raw of rawEntries) {
    try {
      entries.push(normalizeThumbnailEntry(raw));
    } catch {
      // Ignore invalid entries; they will be cleaned up on the next write path.
    }
  }
  return entries;
}

export async function getThumbnailBlob(mapId: string): Promise<Blob | null> {
  const db = await initDB();
  if (!hasThumbnailStores(db)) return null;

  const entryRaw = await db.get(THUMBNAIL_METADATA_STORE, mapId);
  if (!entryRaw) return null;

  let entry: ThumbnailCacheEntry;
  try {
    entry = normalizeThumbnailEntry(entryRaw);
  } catch {
    // Clean up invalid record.
    const tx = db.transaction(THUMBNAIL_METADATA_STORE, 'readwrite');
    await tx.objectStore(THUMBNAIL_METADATA_STORE).delete(mapId);
    await tx.done;
    return null;
  }

  const blob = await db.get(THUMBNAIL_BLOB_STORE, entry.blobKey);
  if (blob instanceof Blob) return blob;
  return null;
}

export async function deleteThumbnail(mapId: string): Promise<void> {
  const db = await initDB();
  if (!hasThumbnailStores(db)) return;

  const tx = db.transaction([THUMBNAIL_METADATA_STORE, THUMBNAIL_BLOB_STORE], 'readwrite');
  const metadataStore = tx.objectStore(THUMBNAIL_METADATA_STORE);
  const blobStore = tx.objectStore(THUMBNAIL_BLOB_STORE);
  const raw = await metadataStore.get(mapId);
  if (raw) {
    try {
      const entry = normalizeThumbnailEntry(raw);
      await blobStore.delete(entry.blobKey);
    } catch {
      // ignore invalid entry; metadata delete below handles cleanup.
    }
  }
  await metadataStore.delete(mapId);
  await tx.done;
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
