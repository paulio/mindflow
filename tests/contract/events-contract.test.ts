import { describe, it, expect } from 'vitest';
import { events } from '../../src/lib/events';

describe('Events Contract', () => {
  it('emits required payload shapes', () => {
    let received: any = null;
    events.on('graph:created', p => { received = p; });
    events.emit('graph:created', { graphId: 'g1' });
    expect(received).toEqual({ graphId: 'g1' });
  });
});

