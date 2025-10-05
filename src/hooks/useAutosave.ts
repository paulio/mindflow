import { useCallback, useEffect, useRef } from 'react';
import { AutosaveScheduler } from '../lib/autosave-scheduler';
import { events } from '../lib/events';

interface UseAutosaveOptions<T> {
  data: T | null;
  save: (data: T | null) => Promise<void> | void;
  debounceMs?: number;
  idleMs?: number;
  onIdle?: (data: T | null) => Promise<void> | void;
  onBeforeUnload?: (data: T | null) => Promise<void> | void;
}

export interface UseAutosaveControls {
  pause: () => void;
  resume: () => void;
  flush: () => Promise<void> | void;
}

export function useAutosave<T>({
  data,
  save,
  debounceMs,
  idleMs,
  onIdle,
  onBeforeUnload,
}: UseAutosaveOptions<T>): UseAutosaveControls {
  const dataRef = useRef<T | null>(data);
  dataRef.current = data;

  const saveRef = useRef(save);
  saveRef.current = save;

  const idleRef = useRef(onIdle ?? null);
  idleRef.current = onIdle ?? null;

  const beforeUnloadRef = useRef(onBeforeUnload ?? null);
  beforeUnloadRef.current = onBeforeUnload ?? null;

  const schedulerRef = useRef<AutosaveScheduler | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const pendingWhilePausedRef = useRef(false);
  const pendingIdleWhilePausedRef = useRef(false);

  const idleDelay = idleMs ?? 10000;

  if (!schedulerRef.current) {
    schedulerRef.current = new AutosaveScheduler(async () => {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        await saveRef.current?.(dataRef.current ?? null);
        const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
        events.emit('autosave:success', { entityType: 'graph', count: 1, elapsedMs: end - start });
      } catch (error) {
        events.emit('autosave:failure', { entityType: 'graph', attempt: 1, error });
      }
    }, { debounceMs });
  }

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdle = useCallback(() => {
    if (!idleRef.current) {
      clearIdleTimer();
      return;
    }
  clearIdleTimer();
  pendingIdleWhilePausedRef.current = false;
  idleTimerRef.current = setTimeout(() => {
      if (pausedRef.current) {
        pendingIdleWhilePausedRef.current = true;
        return;
      }
      pendingIdleWhilePausedRef.current = false;
      Promise.resolve(idleRef.current?.(dataRef.current ?? null)).catch(() => { /* swallow idle errors */ });
    }, idleDelay);
  }, [clearIdleTimer, idleDelay]);

  useEffect(() => {
    if (!schedulerRef.current) return;

    if (data === null || data === undefined) {
      schedulerRef.current.cancel();
      clearIdleTimer();
      pendingWhilePausedRef.current = false;
      pendingIdleWhilePausedRef.current = false;
      return;
    }

    if (pausedRef.current) {
      pendingWhilePausedRef.current = true;
      pendingIdleWhilePausedRef.current = idleRef.current ? true : false;
      return;
    }

    pendingWhilePausedRef.current = false;
    schedulerRef.current.request();
    scheduleIdle();

    return () => {
      clearIdleTimer();
    };
  }, [data, scheduleIdle, clearIdleTimer]);

  useEffect(() => () => {
    schedulerRef.current?.cancel();
    clearIdleTimer();
  }, [clearIdleTimer]);

  useEffect(() => {
    if (!onBeforeUnload) return;
    const handler = () => {
      const fn = beforeUnloadRef.current;
      if (!fn) return;
      try {
        void fn(dataRef.current ?? null);
      } catch {
        /* ignore unload errors */
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [onBeforeUnload]);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    schedulerRef.current?.pause();
    clearIdleTimer();
  }, [clearIdleTimer]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    schedulerRef.current?.resume();
    if (pendingWhilePausedRef.current) {
      pendingWhilePausedRef.current = false;
      schedulerRef.current?.request();
    }
    if (pendingIdleWhilePausedRef.current) {
      pendingIdleWhilePausedRef.current = false;
      scheduleIdle();
    }
  }, [scheduleIdle]);

  const flush = useCallback(async () => {
    await schedulerRef.current?.flush();
  }, []);

  return { pause, resume, flush };
}
