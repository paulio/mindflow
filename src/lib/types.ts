export interface GraphRecord {
  id: string;
  name: string;
  created: string; // ISO
  lastModified: string; // ISO
  lastOpened: string; // ISO
  schemaVersion: number; // >=1
  settings?: { autoLoadLast?: boolean };
  viewport?: { x: number; y: number; zoom: number }; // canvas transform persisted per map (FR-035)
}

export interface NodeRecord {
  id: string;
  graphId: string;
  text: string; // <=255
  x: number;
  y: number;
  created: string;
  lastModified: string;
  // Toolbar extension fields (Feature 003)
  nodeKind?: 'thought' | 'note' | 'rect'; // undefined => 'thought' for backward compatibility
  bgColor?: string; // persisted hex or token reference
  textColor?: string; // notes only
  frontFlag?: boolean; // true => render above thought nodes (default true)
  width?: number; // rectangles: persisted width (FR-041..FR-044)
  height?: number; // rectangles: persisted height (FR-041..FR-044)
  textAlign?: 'left' | 'center' | 'right'; // notes: horizontal alignment
  textVAlign?: 'top' | 'middle' | 'bottom'; // notes: vertical alignment
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
