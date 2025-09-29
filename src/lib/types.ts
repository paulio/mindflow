export interface GraphRecord {
  id: string;
  name: string;
  created: string; // ISO
  lastModified: string; // ISO
  lastOpened: string; // ISO
  schemaVersion: number; // >=1
  settings?: { autoLoadLast?: boolean };
}

export interface NodeRecord {
  id: string;
  graphId: string;
  text: string; // <=255
  x: number;
  y: number;
  created: string;
  lastModified: string;
}

export interface EdgeRecord {
  id: string;
  graphId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandleId?: string;
  targetHandleId?: string;
  created: string;
  undirected: true;
}

export interface PersistenceSnapshot {
  graph: GraphRecord;
  nodes: NodeRecord[];
  edges: EdgeRecord[];
}

export type IDBStores = 'graphs' | 'graphNodes' | 'graphEdges' | 'settings';
