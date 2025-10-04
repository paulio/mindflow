import type { PersistenceSnapshot, GraphRecord, NodeRecord, EdgeRecord, ReferenceConnectionRecord } from '../../src/lib/types';

const BASE_TIMESTAMP = '2025-01-01T00:00:00.000Z';

interface FixtureOverrides {
  graph?: Partial<GraphRecord>;
  nodes?: Array<Partial<NodeRecord>>;
  edges?: Array<Partial<EdgeRecord>>;
  references?: Array<Partial<ReferenceConnectionRecord>>;
}

export type TestMapSnapshot = PersistenceSnapshot;

function createGraphRecord(id: string, name: string, index: number): GraphRecord {
  const timestamp = new Date(Date.parse(BASE_TIMESTAMP) + index * 60_000).toISOString();
  return {
    id,
    name,
    created: timestamp,
    lastModified: timestamp,
    lastOpened: timestamp,
    schemaVersion: 3,
    settings: { autoLoadLast: true },
    viewport: { x: 0, y: 0, zoom: 1 }
  };
}

function createNodeRecord(graphId: string, id: string, text: string, index: number): NodeRecord {
  const timestamp = new Date(Date.parse(BASE_TIMESTAMP) + index * 60_000).toISOString();
  return {
    id,
    graphId,
    text,
    x: index * 120,
    y: 0,
    created: timestamp,
    lastModified: timestamp,
    nodeKind: 'thought',
    frontFlag: true,
    currentBorderColour: '#4f9dff',
    originalBorderColour: '#4f9dff'
  };
}

function createEdgeRecord(graphId: string, id: string, source: string, target: string, index: number): EdgeRecord {
  const timestamp = new Date(Date.parse(BASE_TIMESTAMP) + index * 60_000).toISOString();
  return {
    id,
    graphId,
    sourceNodeId: source,
    targetNodeId: target,
    created: timestamp,
    undirected: true
  };
}

export function createTestMapSnapshot(id: string, name: string, overrides: FixtureOverrides = {}): TestMapSnapshot {
  const baseGraph = createGraphRecord(id, name, 0);
  const graph: GraphRecord = { ...baseGraph, ...overrides.graph };

  const nodeA = createNodeRecord(graph.id, `${graph.id}-root`, `${name} Root`, 0);
  const nodeB = createNodeRecord(graph.id, `${graph.id}-child`, `${name} Child`, 1);
  const nodes: NodeRecord[] = [nodeA, nodeB].map((node, idx) => ({
    ...node,
    ...(overrides.nodes?.[idx] ?? {})
  }));

  const edge = createEdgeRecord(graph.id, `${graph.id}-edge`, nodeA.id, nodeB.id, 0);
  const edges: EdgeRecord[] = [{
    ...edge,
    ...(overrides.edges?.[0] ?? {})
  }];

  const references: ReferenceConnectionRecord[] = overrides.references?.map((reference, idx) => ({
    id: `${graph.id}-ref-${idx}`,
    graphId: graph.id,
    sourceNodeId: nodeA.id,
    targetNodeId: nodeB.id,
    style: 'single',
    created: BASE_TIMESTAMP,
    lastModified: BASE_TIMESTAMP,
    ...reference
  })) ?? [];

  return {
    graph,
    nodes,
    edges,
    references
  };
}

export function createTestMapSnapshots(): TestMapSnapshot[] {
  return [
    createTestMapSnapshot('graph-alpha', 'Alpha Map'),
    createTestMapSnapshot('graph-beta', 'Beta Map', {
      graph: { schemaVersion: 2, lastModified: '2024-12-31T23:59:59.000Z' }
    }),
    createTestMapSnapshot('graph-gamma', 'Gamma Map', {
      graph: { schemaVersion: 1, lastModified: '2024-11-01T12:00:00.000Z' }
    })
  ];
}

export function createManifestLike() {
  const snapshots = createTestMapSnapshots();
  return {
    manifestVersion: 1,
    generatedAt: BASE_TIMESTAMP,
    appVersion: '1.4.0',
    totalMaps: snapshots.length,
    maps: snapshots.map(snapshot => ({
      id: snapshot.graph.id,
      name: snapshot.graph.name,
      schemaVersion: snapshot.graph.schemaVersion,
      payloadPath: `maps/${snapshot.graph.id}.json`,
      lastModified: snapshot.graph.lastModified
    }))
  };
}

export function createImportSummaryLike(overrides: Partial<{
  totalProcessed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  messages: Array<{ mapId: string; level: 'info' | 'warning' | 'error'; detail: string }>;
}> = {}) {
  const defaults = {
    totalProcessed: 3,
    succeeded: 2,
    skipped: 1,
    failed: 0,
    messages: [
      { mapId: 'graph-alpha', level: 'info' as const, detail: 'Imported successfully.' },
      { mapId: 'graph-beta', level: 'warning' as const, detail: 'Skipped due to conflict.' }
    ]
  };
  return { ...defaults, ...overrides };
}
