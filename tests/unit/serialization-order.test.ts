import { describe, it, expect } from 'vitest';
import { sortNodesDeterministic } from '../../src/lib/graph-domain';

describe('Deterministic serialization ordering util', () => {
  it('sorts nodes by created then id', () => {
    const nodes = [
      { id: 'b', graphId: 'g', text: '', x:0, y:0, created: '2025-01-02T00:00:00.000Z', lastModified: '2025-01-02T00:00:00.000Z' },
      { id: 'a', graphId: 'g', text: '', x:0, y:0, created: '2025-01-01T00:00:00.000Z', lastModified: '2025-01-01T00:00:00.000Z' }
    ];
    const ordered = sortNodesDeterministic(nodes);
    expect(ordered[0].id).toBe('a');
    expect(ordered[1].id).toBe('b');
  });
});

