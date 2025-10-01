import { describe, it, expect } from 'vitest';
import { sortNodesDeterministic, sortEdgesDeterministic } from '../../src/lib/graph-domain';

describe('Serialization Ordering Contract', () => {
  it('enforces nodes then edges ordering', () => {
    const nodes = [
      { id: 'b', graphId: 'g', text: '', x:0, y:0, created: '2025-01-02T00:00:00.000Z', lastModified: '2025-01-02T00:00:00.000Z', nodeKind:'note' as const, fontFamily:'Inter', fontSize:16, overflowMode:'auto-resize' as const, backgroundOpacity:90 },
      { id: 'a', graphId: 'g', text: '', x:0, y:0, created: '2025-01-01T00:00:00.000Z', lastModified: '2025-01-01T00:00:00.000Z', nodeKind:'note' as const, fontFamily:'Georgia', fontSize:14, overflowMode:'truncate' as const, backgroundOpacity:100 }
    ];
    const edges = [
      { id: 'e2', graphId: 'g', sourceNodeId: 'b', targetNodeId: 'a', created: '2025-01-03T00:00:00.000Z', undirected: true as const },
      { id: 'e1', graphId: 'g', sourceNodeId: 'a', targetNodeId: 'b', created: '2025-01-02T00:00:00.000Z', undirected: true as const }
    ];
    const sn = sortNodesDeterministic(nodes);
    const se = sortEdgesDeterministic(edges);
    expect(sn[0].id).toBe('a');
    expect(se[0].id).toBe('e1');
  });
});

