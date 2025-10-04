export const EXPORT_MANIFEST_VERSION = 1;
export const CURRENT_MAP_SCHEMA_VERSION = 3;

export interface ExportManifestMapEntry {
  id: string;
  name: string;
  schemaVersion: number;
  payloadPath: string;
  lastModified: string;
}

export interface ExportManifest {
  manifestVersion: number;
  generatedAt: string;
  appVersion: string;
  totalMaps: number;
  maps: ExportManifestMapEntry[];
  notes?: string;
}

export interface MapSnapshotMetadata {
  id: string;
  name: string;
  updatedAt: string;
  schemaVersion: number;
  payloadPath: string;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    referenceCount: number;
    viewport?: GraphRecord['viewport'];
    settings?: GraphRecord['settings'];
  };
}

export interface ExportedMapPayload {
  graph: GraphRecord;
  nodes: NodeRecord[];
  edges: EdgeRecord[];
  references: ReferenceConnectionRecord[];
}

export interface ExportedMapSnapshot {
  snapshot: MapSnapshotMetadata;
  payload: ExportedMapPayload;
}

export type ConflictResolutionAction = 'overwrite' | 'add' | 'cancel';

export interface ConflictResolutionResult {
  mapId: string;
  action: ConflictResolutionAction;
  resolvedName?: string;
  timestamp: string;
}

export interface ImportSummaryMessage {
  mapId: string;
  level: 'info' | 'warning' | 'error';
  detail: string;
}

export interface ImportSummary {
  totalProcessed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  messages: ImportSummaryMessage[];
}

export interface ImportEntry {
  snapshot: MapSnapshotMetadata;
  payload: ExportedMapPayload;
  conflict: boolean;
  resolution?: ConflictResolutionResult;
  migrationAttempted: boolean;
  migrationSucceeded?: boolean;
  migrationNotes?: string[];
}

export interface ImportSession {
  sessionId: string;
  startedAt: string;
  status: 'pending' | 'confirming' | 'applying' | 'completed' | 'cancelled' | 'failed';
  entries: ImportEntry[];
  conflictPolicy: 'prompt';
  summary?: ImportSummary;
}

export interface ExportBundleOptions {
  appVersion: string;
  manifestVersion?: number;
  generatedAt?: string;
  notes?: string;
}

export interface ExportBundle {
  manifest: ExportManifest;
  maps: ExportedMapSnapshot[];
  zip: JSZip;
}

export type ManifestValidationErrorCode =
  | 'MANIFEST_INVALID'
  | 'MANIFEST_MISSING_FIELD'
  | 'MANIFEST_INTEGRITY_MISMATCH'
  | 'MANIFEST_DUPLICATE_ID'
  | 'MANIFEST_UNSUPPORTED_VERSION';

export class ManifestValidationError extends Error {
  code: ManifestValidationErrorCode;
  field?: string;

  constructor(code: ManifestValidationErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ManifestValidationError';
    this.code = code;
    this.field = field;
  }
}

function cloneGraphRecord(graph: GraphRecord): GraphRecord {
  return {
    id: graph.id,
    name: graph.name,
    created: graph.created,
    lastModified: graph.lastModified,
    lastOpened: graph.lastOpened,
    schemaVersion: graph.schemaVersion,
    settings: graph.settings ? { ...graph.settings } : undefined,
    viewport: graph.viewport ? { ...graph.viewport } : undefined,
  };
}

function cloneNodeRecord(node: NodeRecord): NodeRecord {
  return { ...node };
}

function cloneEdgeRecord(edge: EdgeRecord): EdgeRecord {
  return { ...edge };
}

function cloneReferenceRecord(reference: ReferenceConnectionRecord): ReferenceConnectionRecord {
  return { ...reference };
}

function sortNodes(nodes: NodeRecord[]): NodeRecord[] {
  return [...nodes]
    .sort((a, b) => (a.created === b.created ? a.id.localeCompare(b.id) : a.created.localeCompare(b.created)))
    .map(cloneNodeRecord);
}

function sortEdges(edges: EdgeRecord[]): EdgeRecord[] {
  return [...edges]
    .sort((a, b) => (a.created === b.created ? a.id.localeCompare(b.id) : a.created.localeCompare(b.created)))
    .map(cloneEdgeRecord);
}

function sortReferences(references: ReferenceConnectionRecord[] = []): ReferenceConnectionRecord[] {
  return [...references]
    .sort((a, b) => (a.created === b.created ? a.id.localeCompare(b.id) : a.created.localeCompare(b.created)))
    .map(cloneReferenceRecord);
}

function createExportedMap(snapshot: PersistenceSnapshot): ExportedMapSnapshot {
  const graph = cloneGraphRecord(snapshot.graph);
  graph.schemaVersion = graph.schemaVersion ?? CURRENT_MAP_SCHEMA_VERSION;
  const nodes = sortNodes(snapshot.nodes || []);
  const edges = sortEdges(snapshot.edges || []);
  const references = sortReferences(snapshot.references || []);

  const payloadPath = `maps/${graph.id}.json`;
  const metadata: MapSnapshotMetadata = {
    id: graph.id,
    name: graph.name,
  schemaVersion: graph.schemaVersion,
    payloadPath,
    updatedAt: graph.lastModified,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      referenceCount: references.length,
      viewport: graph.viewport ? { ...graph.viewport } : undefined,
      settings: graph.settings ? { ...graph.settings } : undefined,
    },
  };

  return {
    snapshot: metadata,
    payload: {
      graph,
      nodes,
      edges,
      references,
    },
  };
}

export function validateExportManifest(manifest: unknown): asserts manifest is ExportManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new ManifestValidationError('MANIFEST_INVALID', 'Manifest must be an object');
  }

  const candidate = manifest as Partial<ExportManifest> & { maps?: Array<Partial<ExportManifestMapEntry>> };

  if (typeof candidate.manifestVersion !== 'number') {
    throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'manifestVersion missing', 'manifestVersion');
  }

  if (candidate.manifestVersion <= 0) {
    throw new ManifestValidationError('MANIFEST_UNSUPPORTED_VERSION', `Unsupported manifest version: ${candidate.manifestVersion}`, 'manifestVersion');
  }

  if (typeof candidate.generatedAt !== 'string') {
    throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'generatedAt missing', 'generatedAt');
  }

  if (typeof candidate.appVersion !== 'string') {
    throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'appVersion missing', 'appVersion');
  }

  if (!Array.isArray(candidate.maps)) {
    throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'maps missing', 'maps');
  }

  if (typeof candidate.totalMaps !== 'number') {
    throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'totalMaps missing', 'totalMaps');
  }

  if (candidate.totalMaps !== candidate.maps.length) {
    throw new ManifestValidationError('MANIFEST_INTEGRITY_MISMATCH', 'totalMaps does not match maps length', 'totalMaps');
  }

  const seenIds = new Set<string>();
  candidate.maps.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new ManifestValidationError('MANIFEST_INVALID', `maps[${index}] must be an object`, 'maps');
    }
  const { id, name, payloadPath, lastModified, schemaVersion } = entry;
    if (typeof id !== 'string' || !id.trim()) {
      throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'Map id missing', 'maps.id');
    }
    if (seenIds.has(id)) {
      throw new ManifestValidationError('MANIFEST_DUPLICATE_ID', `Duplicate map id "${id}"`, 'maps.id');
    }
    seenIds.add(id);
    if (typeof name !== 'string' || !name.trim()) {
      throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'Map name missing', 'maps.name');
    }
    if (typeof payloadPath !== 'string' || !payloadPath.trim()) {
      throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'payloadPath missing', 'maps.payloadPath');
    }
    if (typeof lastModified !== 'string' || !lastModified.trim()) {
      throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'lastModified missing', 'maps.lastModified');
    }
    if (typeof schemaVersion !== 'number') {
      throw new ManifestValidationError('MANIFEST_MISSING_FIELD', 'schemaVersion missing', 'maps.schemaVersion');
    }
  });
}

export type ImportValidationErrorCode =
  | 'IMPORT_MANIFEST_MISSING'
  | 'IMPORT_MANIFEST_INVALID'
  | 'IMPORT_MANIFEST_UNSUPPORTED'
  | 'IMPORT_PAYLOAD_MISSING'
  | 'IMPORT_PAYLOAD_INVALID'
  | 'IMPORT_ABORTED';

export class ImportValidationError extends Error {
  code: ImportValidationErrorCode;
  field?: string;

  constructor(code: ImportValidationErrorCode, message: string, field?: string, cause?: unknown) {
    super(message);
    this.name = 'ImportValidationError';
    this.code = code;
    this.field = field;
    if (cause) {
      (this as any).cause = cause;
    }
  }
}

export type ImportSummaryValidationErrorCode =
  | 'IMPORT_SUMMARY_TOTAL_MISMATCH'
  | 'IMPORT_SUMMARY_CANCEL_WARNING_MISSING'
  | 'IMPORT_SUMMARY_FAILED_MESSAGE_MISSING';

export class ImportSummaryValidationError extends Error {
  code: ImportSummaryValidationErrorCode;

  constructor(code: ImportSummaryValidationErrorCode, message: string) {
    super(message);
    this.name = 'ImportSummaryValidationError';
    this.code = code;
  }
}

export function validateImportSummary(
  summary: ImportSummary,
  context: { cancelled?: boolean; failedMapIds?: string[] } = {},
): void {
  const total = summary.succeeded + summary.skipped + summary.failed;
  if (summary.totalProcessed !== total) {
    throw new ImportSummaryValidationError('IMPORT_SUMMARY_TOTAL_MISMATCH', 'Totals do not align with processed counts');
  }

  if (context.cancelled) {
    const hasWarning = summary.messages.some(msg => msg.level === 'warning' && /cancel/i.test(msg.detail));
    if (!hasWarning) {
      throw new ImportSummaryValidationError('IMPORT_SUMMARY_CANCEL_WARNING_MISSING', 'Cancellation warning message missing');
    }
  }

  const failedMapIds = context.failedMapIds ?? [];
  if (failedMapIds.length) {
    const errorMessages = summary.messages.filter(msg => msg.level === 'error');
    for (const mapId of failedMapIds) {
      const hasError = errorMessages.some(msg => msg.mapId === mapId);
      if (!hasError) {
        throw new ImportSummaryValidationError('IMPORT_SUMMARY_FAILED_MESSAGE_MISSING', `Missing error message for failed map ${mapId}`);
      }
    }
  }
}

export async function buildExportBundle(
  snapshots: PersistenceSnapshot[],
  options: ExportBundleOptions,
): Promise<ExportBundle> {
  const manifestVersion = options.manifestVersion ?? EXPORT_MANIFEST_VERSION;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sortedSnapshots = [...snapshots].sort((a, b) => b.graph.lastModified.localeCompare(a.graph.lastModified));
  const maps = sortedSnapshots.map(createExportedMap);

  const manifest: ExportManifest = {
    manifestVersion,
    generatedAt,
    appVersion: options.appVersion,
    totalMaps: maps.length,
    maps: maps.map(({ snapshot }) => ({
      id: snapshot.id,
      name: snapshot.name,
      schemaVersion: snapshot.schemaVersion,
      payloadPath: snapshot.payloadPath,
      lastModified: snapshot.updatedAt,
    })),
  };

  if (options.notes) {
    manifest.notes = options.notes;
  }

  validateExportManifest(manifest);

  const zip = new JSZip();
  maps.forEach(({ snapshot, payload }) => {
    zip.file(snapshot.payloadPath, JSON.stringify(payload, null, 2));
  });
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return { manifest, maps, zip };
}

export type ExportLogEvent =
  | { type: 'export.started'; mapCount: number; generatedAt: string; manifestVersion: number }
  | { type: 'export.completed'; mapCount: number; generatedAt: string; durationMs: number; fileName: string; manifestVersion: number };

export interface ExportArchiveOptions extends ExportBundleOptions {
  fileName?: string;
  signal?: AbortSignal;
  pauseAutosave?: () => Promise<void> | void;
  resumeAutosave?: () => Promise<void> | void;
  logger?: (event: ExportLogEvent) => void;
}

export interface ExportArchiveResult {
  manifest: ExportManifest;
  maps: ExportedMapSnapshot[];
  blob: Blob;
  fileName: string;
  durationMs: number;
}

function defaultExportFileName(timestamp: string): string {
  const safe = timestamp.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `mindflow-export-${safe}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal) return;
  if (!signal.aborted) return;
  const reason = (signal as any).reason;
  if (reason instanceof Error) throw reason;
  throw new DOMException('The export operation was aborted.', 'AbortError');
}

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

export async function generateExportArchive(
  snapshots: PersistenceSnapshot[],
  options: ExportArchiveOptions,
): Promise<ExportArchiveResult> {
  const pause = options.pauseAutosave ?? (() => {});
  const resume = options.resumeAutosave ?? (() => {});
  const logger = options.logger;

  throwIfAborted(options.signal);
  await pause();

  const start = nowMs();
  try {
    const bundle = await buildExportBundle(snapshots, options);
    throwIfAborted(options.signal);

    logger?.({
      type: 'export.started',
      mapCount: bundle.manifest.totalMaps,
      generatedAt: bundle.manifest.generatedAt,
      manifestVersion: bundle.manifest.manifestVersion,
    });

    const zipBuffer = await bundle.zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    throwIfAborted(options.signal);
  const arrayBuffer = zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/zip' });

    const elapsed = nowMs() - start;
    const baseName = options.fileName ?? defaultExportFileName(bundle.manifest.generatedAt);
    const fileName = baseName.endsWith('.zip') ? baseName : `${baseName}.zip`;

    logger?.({
      type: 'export.completed',
      mapCount: bundle.manifest.totalMaps,
      generatedAt: bundle.manifest.generatedAt,
      durationMs: elapsed,
      fileName,
      manifestVersion: bundle.manifest.manifestVersion,
    });

    return {
      manifest: bundle.manifest,
      maps: bundle.maps,
  blob,
      fileName,
      durationMs: elapsed,
    };
  } finally {
    await resume();
  }
}

export type ImportLogEvent =
  | { type: 'import.manifestLoaded'; mapCount: number; manifestVersion: number }
  | { type: 'import.entryParsed'; mapId: string; schemaVersion: number; conflict: boolean }
  | { type: 'import.migrationApplied'; mapId: string; fromVersion: number; toVersion: number; notes: string[] }
  | { type: 'import.sessionReady'; sessionId: string; mapCount: number };

export interface ImportArchiveOptions {
  existingGraphs?: Array<Pick<GraphRecord, 'id' | 'name'>>;
  signal?: AbortSignal;
  logger?: (event: ImportLogEvent) => void;
}

export interface ImportArchiveInspection {
  manifest: ExportManifest;
  session: ImportSession;
}

function toArrayBuffer(source: Blob | ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> {
  if (source instanceof ArrayBuffer) {
    return Promise.resolve(source);
  }
  if (ArrayBuffer.isView(source)) {
    const view = source as ArrayBufferView;
    const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return Promise.resolve(buffer as ArrayBuffer);
  }
  if (source instanceof Blob) {
    return source.arrayBuffer();
  }
  return Promise.reject(new TypeError('Unsupported archive source provided.'));
}

function createMetadataFromManifest(entry: ExportManifestMapEntry, payload: ExportedMapPayload): MapSnapshotMetadata {
  return {
    id: entry.id,
    name: entry.name,
    schemaVersion: entry.schemaVersion ?? payload.graph.schemaVersion,
    payloadPath: entry.payloadPath,
    updatedAt: entry.lastModified,
    metadata: {
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      referenceCount: payload.references.length,
      viewport: payload.graph.viewport ? { ...payload.graph.viewport } : undefined,
      settings: payload.graph.settings ? { ...payload.graph.settings } : undefined,
    },
  };
}

function normalizePayload(raw: unknown, entry: ExportManifestMapEntry): ExportedMapPayload {
  if (!raw || typeof raw !== 'object') {
    throw new ImportValidationError('IMPORT_PAYLOAD_INVALID', `Payload for ${entry.payloadPath} is not an object`, entry.payloadPath);
  }
  const payload = raw as { graph?: GraphRecord; nodes?: NodeRecord[]; edges?: EdgeRecord[]; references?: ReferenceConnectionRecord[] };
  if (!payload.graph || typeof payload.graph !== 'object') {
    throw new ImportValidationError('IMPORT_PAYLOAD_INVALID', `Missing graph data for ${entry.payloadPath}`, entry.payloadPath);
  }
  if ((payload.graph as GraphRecord).id !== entry.id) {
    throw new ImportValidationError('IMPORT_PAYLOAD_INVALID', `Graph id mismatch for ${entry.payloadPath}`, entry.payloadPath);
  }
  return {
    graph: payload.graph,
    nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
    edges: Array.isArray(payload.edges) ? payload.edges : [],
    references: Array.isArray(payload.references) ? payload.references : [],
  };
}

function sanitizeImportPayload(payload: ExportedMapPayload): ExportedMapPayload {
  const sanitized: ExportedMapPayload = {
    graph: cloneGraphRecord(payload.graph),
    nodes: sortNodes(payload.nodes),
    edges: sortEdges(payload.edges),
    references: sortReferences(payload.references),
  };
  sanitized.graph.schemaVersion = sanitized.graph.schemaVersion ?? CURRENT_MAP_SCHEMA_VERSION;
  return sanitized;
}

interface MigrationResult {
  payload: ExportedMapPayload;
  notes: string[];
}

function migratePayloadToCurrent(payload: ExportedMapPayload, fromVersion: number): MigrationResult {
  const sanitized = sanitizeImportPayload(payload);
  const notes: string[] = [];

  if (!sanitized.graph.viewport) {
    sanitized.graph.viewport = { x: 0, y: 0, zoom: 1 };
    notes.push('Added default viewport for legacy export');
  }
  if (!sanitized.graph.settings) {
    sanitized.graph.settings = { autoLoadLast: true };
    notes.push('Normalized settings with autoLoadLast=true');
  }

  sanitized.graph.schemaVersion = CURRENT_MAP_SCHEMA_VERSION;
  notes.push(`Upgraded schema from v${fromVersion} to v${CURRENT_MAP_SCHEMA_VERSION}`);

  return { payload: sanitized, notes };
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `import-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function inspectImportArchive(
  source: Blob | ArrayBuffer | ArrayBufferView,
  options: ImportArchiveOptions = {},
): Promise<ImportArchiveInspection> {
  throwIfAborted(options.signal);
  const buffer = await toArrayBuffer(source);
  throwIfAborted(options.signal);

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (error) {
    throw new ImportValidationError('IMPORT_MANIFEST_INVALID', 'Unable to read archive. The file may be corrupted.', undefined, error);
  }

  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    throw new ImportValidationError('IMPORT_MANIFEST_MISSING', 'manifest.json missing from archive');
  }

  let manifestRaw: string;
  try {
    manifestRaw = await manifestEntry.async('string');
  } catch (error) {
    throw new ImportValidationError('IMPORT_MANIFEST_INVALID', 'Unable to read manifest.json', 'manifest.json', error);
  }

  let manifestData: unknown;
  try {
    manifestData = JSON.parse(manifestRaw);
  } catch (error) {
    throw new ImportValidationError('IMPORT_MANIFEST_INVALID', 'manifest.json is not valid JSON', 'manifest.json', error);
  }

  validateExportManifest(manifestData);
  const manifest = manifestData as ExportManifest;
  if (manifest.manifestVersion > EXPORT_MANIFEST_VERSION) {
    throw new ImportValidationError('IMPORT_MANIFEST_UNSUPPORTED', `Unsupported manifest version ${manifest.manifestVersion}`, 'manifestVersion');
  }

  options.logger?.({
    type: 'import.manifestLoaded',
    mapCount: manifest.totalMaps,
    manifestVersion: manifest.manifestVersion,
  });

  const existingIds = new Set(options.existingGraphs?.map(g => g.id) ?? []);
  const existingNames = new Set((options.existingGraphs ?? []).map(g => g.name.toLowerCase()));

  const entries: ImportEntry[] = [];
  for (const mapEntry of manifest.maps) {
    throwIfAborted(options.signal);
    const payloadFile = zip.file(mapEntry.payloadPath);
    if (!payloadFile) {
      throw new ImportValidationError('IMPORT_PAYLOAD_MISSING', `Payload not found at ${mapEntry.payloadPath}`, mapEntry.payloadPath);
    }

    let payloadRaw: string;
    try {
      payloadRaw = await payloadFile.async('string');
    } catch (error) {
      throw new ImportValidationError('IMPORT_PAYLOAD_INVALID', `Unable to read payload ${mapEntry.payloadPath}`, mapEntry.payloadPath, error);
    }

    let payloadData: unknown;
    try {
      payloadData = JSON.parse(payloadRaw);
    } catch (error) {
      throw new ImportValidationError('IMPORT_PAYLOAD_INVALID', `Payload ${mapEntry.payloadPath} is not valid JSON`, mapEntry.payloadPath, error);
    }

    let payload = sanitizeImportPayload(normalizePayload(payloadData, mapEntry));
    const originalVersion = mapEntry.schemaVersion ?? payload.graph.schemaVersion ?? CURRENT_MAP_SCHEMA_VERSION;
    let migrationAttempted = false;
    let migrationSucceeded: boolean | undefined;
    let migrationNotes: string[] | undefined;

    if (originalVersion < CURRENT_MAP_SCHEMA_VERSION) {
      migrationAttempted = true;
      try {
        const migrated = migratePayloadToCurrent(payload, originalVersion);
        payload = migrated.payload;
        migrationSucceeded = true;
        migrationNotes = migrated.notes;
        options.logger?.({
          type: 'import.migrationApplied',
          mapId: mapEntry.id,
          fromVersion: originalVersion,
          toVersion: CURRENT_MAP_SCHEMA_VERSION,
          notes: migrationNotes,
        });
      } catch (error) {
        migrationSucceeded = false;
        throw new ImportValidationError('IMPORT_PAYLOAD_INVALID', `Failed to migrate map ${mapEntry.id}`, mapEntry.payloadPath, error);
      }
    }

    const snapshotEntry: ExportManifestMapEntry = {
      ...mapEntry,
      schemaVersion: payload.graph.schemaVersion,
    };
    const snapshot = createMetadataFromManifest(snapshotEntry, payload);
    const conflict = existingIds.has(mapEntry.id) || existingNames.has(mapEntry.name.toLowerCase());
    entries.push({
      snapshot,
      payload,
      conflict,
      migrationAttempted,
      migrationSucceeded,
      migrationNotes,
    });

    options.logger?.({
      type: 'import.entryParsed',
      mapId: mapEntry.id,
      schemaVersion: snapshot.schemaVersion,
      conflict,
    });
  }

  const session: ImportSession = {
    sessionId: generateSessionId(),
    startedAt: new Date().toISOString(),
    status: 'pending',
    entries,
    conflictPolicy: 'prompt',
  };

  options.logger?.({ type: 'import.sessionReady', sessionId: session.sessionId, mapCount: entries.length });

  return { manifest, session };
}

import JSZip from 'jszip';
import { NodeRecord, EdgeRecord, GraphRecord, PersistenceSnapshot, ReferenceConnectionRecord } from './types';
import { findRootNodeId } from './hierarchy';
import { resolveNodeBackground } from './background-precedence';

function escapeMarkdown(text: string): string {
  // Replace newline sequences with a single space, then collapse runs of spaces to a single space.
  return text
    .replace(/\r?\n+/g, ' ')   // newline -> space
    .replace(/ {2,}/g, ' ')      // collapse multiple spaces
    .trimEnd();                  // avoid trailing spaces at line end
}

export function exportGraphAsMarkdown(graph: GraphRecord, nodes: NodeRecord[], edges: EdgeRecord[]): string {
  if (!nodes.length) return `# ${graph.name}\n(Empty graph)`;

  // Build adjacency (undirected)
  const adj = new Map<string, Set<string>>();
  function add(a: string, b: string) { (adj.get(a) || adj.set(a, new Set()).get(a)!).add(b); }
  for (const e of edges) { add(e.sourceNodeId, e.targetNodeId); add(e.targetNodeId, e.sourceNodeId); }

  const byId = new Map(nodes.map(n => [n.id, n] as const));
  // Sort all nodes by created then id for stable deterministic ordering.
  const globalOrder = [...nodes].sort((a,b) => a.created === b.created ? a.id.localeCompare(b.id) : a.created.localeCompare(b.created));
  const globalRootId = findRootNodeId(nodes) as string; // earliest created overall

  const visited = new Set<string>();
  const lines: string[] = [];

  interface ParentMap { [id: string]: string | null; }

  // Build a spanning tree for a component starting from a chosen root (earliest created in that component)
  function buildComponentTree(rootId: string) {
    const queue: string[] = [rootId];
    visited.add(rootId);
    const depth = new Map<string, number>(); depth.set(rootId, 0);
    const parent: ParentMap = { [rootId]: null };
    while (queue.length) {
      const cur = queue.shift()!;
      const nbrs = adj.get(cur);
      if (!nbrs) continue;
      // Determine traversal order: stable by (created, id)
      const orderedNbrs = [...nbrs].filter(id => !visited.has(id)).sort((a,b) => {
        const na = byId.get(a)!; const nb = byId.get(b)!;
        return na.created === nb.created ? na.id.localeCompare(nb.id) : na.created.localeCompare(nb.created);
      });
      for (const nId of orderedNbrs) {
        visited.add(nId);
        parent[nId] = cur;
        depth.set(nId, (depth.get(cur) || 0) + 1);
        queue.push(nId);
      }
    }
    // Build children map
    const children = new Map<string, string[]>();
    for (const id of Object.keys(parent)) { const p = parent[id]; if (p !== null) { (children.get(p) || children.set(p, []).get(p)!).push(id); } }
    // Sort each children list deterministically
    for (const [pid, arr] of children) {
      arr.sort((a,b) => {
        const na = byId.get(a)!; const nb = byId.get(b)!;
        return na.created === nb.created ? na.id.localeCompare(nb.id) : na.created.localeCompare(nb.created);
      });
    }
    // DFS output respecting child ordering
    function emit(id: string) {
      const d = depth.get(id) || 0;
      const indent = '  '.repeat(d);
      const rec = byId.get(id)!;
      lines.push(`${indent}- ${escapeMarkdown(rec.text || 'New Thought')}`);
      const kids = children.get(id) || [];
      for (const k of kids) emit(k);
    }
    emit(rootId);
  }

  // Components: first ensure the global root component is emitted first, then others in creation order.
  if (globalRootId) buildComponentTree(globalRootId);
  for (const n of globalOrder) {
    if (!visited.has(n.id)) {
      buildComponentTree(n.id);
    }
  }

  return lines.join('\n') + '\n';
}

interface CanvasThemeLike {
  nodeBg: string; nodeBorder: string; nodeText: string; edgeColor: string; background: string; borderWidth: number; radius: number;
}

function resolveThemeFromDOM(): CanvasThemeLike {
  const cs = getComputedStyle(document.body);
  return {
    nodeBg: cs.getPropertyValue('--mf-node-bg').trim() || '#1b1b1f',
    nodeBorder: cs.getPropertyValue('--mf-node-border').trim() || '#2a2a30',
    nodeText: cs.getPropertyValue('--mf-node-text').trim() || '#f5f5f5',
    edgeColor: cs.getPropertyValue('--mf-node-border-selected').trim() || '#4f9dff',
    background: cs.getPropertyValue('--color-bg').trim() || '#111',
    borderWidth: parseFloat(cs.getPropertyValue('--mf-node-border-width')) || 1,
    radius: 6,
  };
}

export async function exportGraphAsPng(graph: GraphRecord, nodes: NodeRecord[], edges: EdgeRecord[]): Promise<Blob | null> {
  if (!nodes.length) return null;
  // Approx node dimensions (current styling): width dynamic; we'll measure longest text length
  const theme = resolveThemeFromDOM();
  const padding = 32;
  // Multiline + dimension measurement
  const lineHeight = 14; // px (approximate UI line height)
  interface Dim { w: number; h: number; lines: string[]; }
  const dims = new Map<string, Dim>();
  const INNER_PADDING_X = 4; // matches inner body padding in ThoughtNode
  const MAX_W = 240;
  const MIN_W = 100;
  const MIN_H = 30;
  // Helper to estimate width if DOM not found (pre-wrap)
  function roughEstimateWidth(lines: string[]): number {
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
    return Math.min(MAX_W, Math.max(MIN_W, longest * 7 + INNER_PADDING_X * 2 + 16));
  }
  function measureFromDOM(id: string): { w: number; h: number } | null {
    try {
      const esc = (window as any).CSS?.escape ? (window as any).CSS.escape(id) : id.replace(/"/g, '\\"');
      const el = document.querySelector(`.react-flow__node[data-id="${esc}"]`);
      if (!el) return null;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return null;
      return { w: r.width, h: r.height };
    } catch { return null; }
  }
  // Canvas context for measuring text to wrap accurately
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  if (mctx) { mctx.font = '12px system-ui'; mctx.textBaseline = 'top'; }
  function wrapLine(raw: string, maxWidth: number): string[] {
    if (!mctx) return [raw];
    if (mctx.measureText(raw).width <= maxWidth) return [raw];
    const words = raw.split(/(\s+)/); // keep whitespace tokens
    const out: string[] = [];
    let cur = '';
    for (const token of words) {
      const candidate = cur + token;
      if (mctx.measureText(candidate).width <= maxWidth) {
        cur = candidate;
      } else {
        if (cur.trim().length) out.push(cur.trimEnd());
        // If single token wider than max, hard-break by characters
        if (mctx.measureText(token).width > maxWidth) {
          let chunk = '';
            for (const ch of token) {
              if (mctx.measureText(chunk + ch).width <= maxWidth) {
                chunk += ch;
              } else {
                if (chunk.length) out.push(chunk);
                chunk = ch;
              }
            }
          if (chunk.length) cur = chunk; else cur = '';
        } else {
          cur = token;
        }
      }
    }
    if (cur.trim().length) out.push(cur.trimEnd());
    return out.length ? out : [''];
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const rawText = (n.text || 'New Thought');
    const baseLines = rawText.split(/\r?\n/);
    const domDim = measureFromDOM(n.id); // if present we still wrap to keep consistency; width acts as constraint
    let w = domDim ? domDim.w : (n.width ? Math.min(MAX_W, Math.max(MIN_W, n.width)) : roughEstimateWidth(baseLines));
    w = Math.max(MIN_W, Math.min(MAX_W, w));
    const contentMax = Math.max(20, w - INNER_PADDING_X * 2);
    let wrapped: string[] = [];
    for (const bl of baseLines) {
      const parts = wrapLine(bl, contentMax);
      wrapped.push(...parts);
    }
    // Recalculate width to fit the widest wrapped line if we didn't rely on DOM measurement
    if (!domDim && mctx) {
      let maxLine = 0; for (const l of wrapped) { const lw = mctx.measureText(l).width; if (lw > maxLine) maxLine = lw; }
      const targetW = maxLine + INNER_PADDING_X * 2 + 1; // +1 for rounding
      w = Math.max(MIN_W, Math.min(MAX_W, Math.max(w, targetW)));
    }
    let h = Math.max(MIN_H, wrapped.length * lineHeight + 8);
    if (n.height) h = Math.max(h, n.height);
    dims.set(n.id, { w, h, lines: wrapped });
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + h);
  }
  const width = (maxX - minX) + padding * 2;
  const height = (maxY - minY) + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 8000);
  canvas.height = Math.min(height, 8000);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0,0,canvas.width, canvas.height);
  // Build node lookup and center positions
  const center = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const d = dims.get(n.id)!;
    center.set(n.id, { x: (n.x - minX) + padding + d.w/2, y: (n.y - minY) + padding + d.h/2 });
  }
  // Edges
  ctx.strokeStyle = theme.edgeColor;
  ctx.lineWidth = 1;
  for (const e of edges) {
    const a = center.get(e.sourceNodeId); const b = center.get(e.targetNodeId);
    if (!a || !b) continue;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // Nodes
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const n of nodes) {
    const c = center.get(n.id)!;
    const { w, h, lines } = dims.get(n.id)!;
    const x = c.x - w/2; const y = c.y - h/2;
    // Derive colours using the same precedence as the live node components
    const fill = resolveNodeBackground(n) || theme.nodeBg;
    const borderColour = n.currentBorderColour || n.originalBorderColour || theme.nodeBorder;
    ctx.fillStyle = fill; ctx.strokeStyle = borderColour; ctx.lineWidth = theme.borderWidth;
    // rounded rect
    const r = theme.radius;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Text lines already prepared in dims
    ctx.fillStyle = theme.nodeText;
    ctx.textBaseline = 'top';
    const totalTextHeight = lines.length * lineHeight;
    let ty = c.y - totalTextHeight / 2;
    for (const line of lines) {
      const clipped = line.slice(0, 500); // generous limit
      ctx.fillText(clipped, c.x, ty);
      ty += lineHeight;
    }
  }
  return await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}

export function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}
