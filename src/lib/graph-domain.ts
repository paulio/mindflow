import { generateId } from './indexeddb';
import { EdgeRecord, NodeRecord } from './types';
import { events } from './events';
import { pushUndo } from '../hooks/useUndoRedo';

export interface CreateNodeInput { graphId: string; text?: string; x: number; y: number; }
export function createNode(input: CreateNodeInput): NodeRecord {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    graphId: input.graphId,
    text: (input.text ?? '').slice(0, 255),
    x: Math.round(input.x),
    y: Math.round(input.y),
    created: now,
    lastModified: now
  };
}

// Annotation (toolbar) node creators
export interface CreateAnnotationInput { graphId: string; kind: 'note' | 'rect'; x: number; y: number; }
export function createAnnotationNode(input: CreateAnnotationInput): NodeRecord {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    graphId: input.graphId,
    text: input.kind === 'note' ? '' : '',
    x: Math.round(input.x),
    y: Math.round(input.y),
    created: now,
    lastModified: now,
    nodeKind: input.kind,
    bgColor: undefined,
    textColor: undefined,
    frontFlag: true
  };
}

// Push undo for an annotation node creation (no edges)
export function commitAnnotationCreation(graphId: string, record: NodeRecord, setNodes: React.Dispatch<React.SetStateAction<NodeRecord[]>>) {
  setNodes(ns => [...ns, record]);
  events.emit('node:created', { graphId, nodeId: record.id });
  pushUndo({
    type: record.nodeKind === 'note' ? 'create-note' : 'create-rect',
    undo: () => {
      setNodes(ns => ns.filter(n => n.id !== record.id));
      events.emit('node:deleted', { graphId, nodeId: record.id });
    },
    redo: () => {
      setNodes(ns => ns.some(n => n.id === record.id) ? ns : [...ns, record]);
      events.emit('node:created', { graphId, nodeId: record.id });
    }
  });
}

export interface CreateEdgeInput { graphId: string; sourceNodeId: string; targetNodeId: string; sourceHandleId?: string; targetHandleId?: string; }
export function createEdge(input: CreateEdgeInput): EdgeRecord {
  if (input.sourceNodeId === input.targetNodeId) throw new Error('self edge not allowed');
  const now = new Date().toISOString();
  return {
    id: generateId(),
    graphId: input.graphId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    sourceHandleId: input.sourceHandleId,
    targetHandleId: input.targetHandleId,
    created: now,
    undirected: true
  };
}

export function ensureUniqueNodeIds(nodes: NodeRecord[]) {
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.id)) throw new Error('duplicate node id');
    seen.add(n.id);
  }
}

export function sortNodesDeterministic(nodes: NodeRecord[]): NodeRecord[] {
  return [...nodes].sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
}

export function sortEdgesDeterministic(edges: EdgeRecord[]): EdgeRecord[] {
  return [...edges].sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
}

// Accessibility spatial ordering (simplified; refined in T045)
export function spatialOrder(nodes: NodeRecord[]): string[] {
  return [...nodes]
    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || a.id.localeCompare(b.id))
    .map(n => n.id);
}
