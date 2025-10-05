import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../../src/hooks/useAutosave';

describe('useAutosave hook', () => {
  it('invokes onIdle after the configured idle duration', async () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    renderHook(({ token }) => useAutosave({
      data: token,
      save: async () => {},
      idleMs: 1000,
      onIdle,
    }), { initialProps: { token: 'graph-1:0' } });

    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onIdle.mock.calls[0][0]).toBe('graph-1:0');
    vi.useRealTimers();
  });

  it('defers idle callbacks while paused and resumes after data changes', async () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { result, rerender } = renderHook(({ token }) => useAutosave({
      data: token,
      save: async () => {},
      idleMs: 1000,
      onIdle,
    }), { initialProps: { token: 'graph-2:0' } });

    act(() => {
      result.current.pause();
    });
    rerender({ token: 'graph-2:1' });
    vi.advanceTimersByTime(2000);
    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      result.current.resume();
    });
    rerender({ token: 'graph-2:2' });
    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(onIdle).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('invokes onBeforeUnload handler when the window unloads', () => {
    const onBeforeUnload = vi.fn();
    renderHook(() => useAutosave({
      data: 'graph-3:0',
      save: async () => {},
      onBeforeUnload,
    }));

    window.dispatchEvent(new Event('beforeunload'));
    expect(onBeforeUnload).toHaveBeenCalledTimes(1);
  });
});
