import { generateId } from './indexeddb';
import { EdgeRecord, NodeRecord } from './types';

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

export interface CreateEdgeInput { graphId: string; sourceNodeId: string; targetNodeId: string; }
export function createEdge(input: CreateEdgeInput): EdgeRecord {
  if (input.sourceNodeId === input.targetNodeId) throw new Error('self edge not allowed');
  const now = new Date().toISOString();
  return {
    id: generateId(),
    graphId: input.graphId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
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
