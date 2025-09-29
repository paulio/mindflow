import { describe, it, expect, vi } from 'vitest';
import { AutosaveScheduler } from '../../src/lib/autosave-scheduler';

describe('Autosave scheduler debounce', () => {
  it('debounces rapid calls', async () => {
    vi.useFakeTimers();
    let runs = 0;
    const sched = new AutosaveScheduler(() => { runs++; });
    for (let i = 0; i < 5; i++) sched.request();
    expect(runs).toBe(0);
    vi.advanceTimersByTime(500);
    expect(runs).toBe(1);
    vi.useRealTimers();
  });
});

