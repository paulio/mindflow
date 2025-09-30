import { NodeRecord, EdgeRecord } from './types';

// Compute levels (distance from root) using BFS over undirected edges.
export function computeLevels(rootId: string, nodes: NodeRecord[], edges: EdgeRecord[]): Map<string, number> {
  const level = new Map<string, number>();
  if (!rootId) return level;
  level.set(rootId, 0);
  const adj = new Map<string, Set<string>>();
  function add(a: string, b: string) { (adj.get(a) || adj.set(a, new Set()).get(a)!).add(b); }
  for (const e of edges) {
    add(e.sourceNodeId, e.targetNodeId);
    add(e.targetNodeId, e.sourceNodeId);
  }
  const q: string[] = [rootId];
  while (q.length) {
    const id = q.shift()!;
    const cur = level.get(id)!;
    const nbrs = adj.get(id);
    if (!nbrs) continue;
    for (const n of nbrs) {
      if (!level.has(n)) { level.set(n, cur + 1); q.push(n); }
    }
  }
  return level;
}

export function findRootNodeId(nodes: NodeRecord[]): string | null {
  if (!nodes.length) return null;
  // earliest created timestamp, fallback to first
  let root = nodes[0];
  for (const n of nodes) {
    if (n.created < root.created) root = n;
  }
  return root.id;
}