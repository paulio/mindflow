import { describe, it, expect } from 'vitest';
import { computeLevels, findRootNodeId } from '../../src/lib/hierarchy';

function mkNode(id: string, created: string, x=0,y=0): any { return { id, graphId:'g', text:'', x,y, created, lastModified: created }; }
function mkEdge(id: string, a: string, b: string, created: string): any { return { id, graphId:'g', sourceNodeId:a, targetNodeId:b, created, undirected:true }; }

describe('hierarchy BFS levels (FR-042)', () => {
  it('computes levels root -> children -> grandchildren', () => {
    const nodes = [
      mkNode('root','2025-01-01T00:00:00.000Z'),
      mkNode('c1','2025-01-01T00:00:01.000Z'),
      mkNode('c2','2025-01-01T00:00:02.000Z'),
      mkNode('gc1','2025-01-01T00:00:03.000Z')
    ];
    const edges = [
      mkEdge('e1','root','c1','2025-01-01T00:00:10.000Z'),
      mkEdge('e2','root','c2','2025-01-01T00:00:11.000Z'),
      mkEdge('e3','c1','gc1','2025-01-01T00:00:12.000Z')
    ];
    const rootId = findRootNodeId(nodes as any)!;
    expect(rootId).toBe('root');
    const levels = computeLevels(rootId, nodes as any, edges as any);
    expect(levels.get('root')).toBe(0);
    expect(levels.get('c1')).toBe(1);
    expect(levels.get('c2')).toBe(1);
    expect(levels.get('gc1')).toBe(2);
  });

  it('handles cycle choosing shortest depth', () => {
    const nodes = [mkNode('a','2025-01-01T00:00:00.000Z'), mkNode('b','2025-01-01T00:00:01.000Z'), mkNode('c','2025-01-01T00:00:02.000Z')];
    const edges = [mkEdge('e1','a','b','ts'), mkEdge('e2','b','c','ts'), mkEdge('e3','c','a','ts')];
    const rootId = findRootNodeId(nodes as any)!;
    const levels = computeLevels(rootId, nodes as any, edges as any);
    // All nodes reachable: root=0, others=1 via shortest path
    const others = nodes.filter(n=>n.id!==rootId);
    others.forEach(n => expect(levels.get(n.id)).toBe(1));
  });
});
