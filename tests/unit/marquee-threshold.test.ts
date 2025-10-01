import { describe, it, expect } from 'vitest';
import { createGraphStore } from '../../src/state/graph-store';

// This test focuses on state transitions; actual pointer binding occurs in GraphCanvas.
// Activation beyond threshold will be simulated by manually setting active once distance is exceeded.

describe('marquee threshold (state-only)', () => {
  it('does not activate when movement under threshold', () => {
    const store = createGraphStore();
    // @ts-ignore
    store.getState().beginMarquee?.(10,10,false);
    // Implementation: active is false until threshold logic in component promotes it.
    // There is no direct activation here; ensure state reflects pending marquee.
    // @ts-ignore
    const pending = store.getState().marquee;
    expect(pending).toBeDefined();
    // @ts-ignore
    expect(pending.active).toBe(false);
  });
});
