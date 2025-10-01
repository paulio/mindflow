import { describe, it, expect } from 'vitest';
import { sortNodesDeterministic } from '../../src/lib/graph-domain';

describe('Deterministic serialization ordering util', () => {
  it('sorts nodes by created then id', () => {
    const nodes = [
      { id: 'b', graphId: 'g', text: '', x:0, y:0, created: '2025-01-02T00:00:00.000Z', lastModified: '2025-01-02T00:00:00.000Z', nodeKind: 'note' as const, fontSize:16, fontFamily:'Inter', overflowMode:'auto-resize' as const, backgroundOpacity:80 },
      { id: 'a', graphId: 'g', text: '', x:0, y:0, created: '2025-01-01T00:00:00.000Z', lastModified: '2025-01-01T00:00:00.000Z', nodeKind: 'note' as const, fontSize:14, fontFamily:'Georgia', overflowMode:'truncate' as const, backgroundOpacity:100 }
    ];
    const ordered = sortNodesDeterministic(nodes);
    expect(ordered[0].id).toBe('a');
    expect(ordered[1].id).toBe('b');
  });
});

