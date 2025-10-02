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
  // Rich note formatting (Feature 004)
  fontFamily?: string; // resolved/verified font family token
  fontSize?: number; // px within 10-48
  fontWeight?: number | 'normal' | 'bold'; // simplified weight control
  italic?: boolean;
  underline?: boolean; // reserved for potential future UI
  highlight?: boolean; // emphasis flag
  backgroundOpacity?: number; // 0-100
  overflowMode?: 'truncate' | 'auto-resize' | 'scroll';
  hideShapeWhenUnselected?: boolean;
  maxWidth?: number; // advisory manual width limit (may be unused v1)
  maxHeight?: number; // vertical auto-resize ceiling (default 280)
  // Border colour override (Feature 007)
  /** Colour originally assigned via depth->palette mapping at creation */
  originalBorderColour?: string;
  /** Current effective border colour (override OR original) */
  currentBorderColour?: string;
  /** Index captured from palette (0-based) or -1 if fallback used */
  borderPaletteIndex?: number;
  /** True when user has explicitly overridden the border colour */
  borderOverrideFlag?: boolean;
  /** Explicit override colour (#rrggbb) when borderOverrideFlag true */
  borderOverrideColour?: string;
  /** Hierarchical depth used for background (fill) colour sequencing (0-root). */
  hierDepth?: number;
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

// Reference connections (Feature 005) are distinct logical edges with directional semantics and style/label metadata.
export interface ReferenceConnectionRecord {
  id: string;
  graphId: string;
  sourceNodeId: string; // cannot equal targetNodeId (self disallowed)
  targetNodeId: string;
  sourceHandleId?: string; // optional port metadata (reuse existing port ids)
  targetHandleId?: string;
  style: 'single' | 'double' | 'none'; // arrow end-cap style
  label?: string; // optional short text (<=255 in UI enforcement)
  labelHidden?: boolean; // true => label not rendered
  created: string;
  lastModified: string;
}

export interface PersistenceSnapshot {
  graph: GraphRecord;
  nodes: NodeRecord[];
  edges: EdgeRecord[];
  references?: ReferenceConnectionRecord[]; // optional for backward compatibility
}

export type IDBStores = 'graphs' | 'graphNodes' | 'graphEdges' | 'settings';
