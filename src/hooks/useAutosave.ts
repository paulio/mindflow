import { useEffect, useRef } from 'react';
import { AutosaveScheduler } from '../lib/autosave-scheduler';
import { events } from '../lib/events';

interface UseAutosaveOptions<T> {
  data: T;
  save: (data: T) => Promise<void> | void;
}

export function useAutosave<T>({ data, save }: UseAutosaveOptions<T>) {
  const ref = useRef(data);
  ref.current = data;
  const schedulerRef = useRef<AutosaveScheduler | null>(null);
  if (!schedulerRef.current) {
    schedulerRef.current = new AutosaveScheduler(async () => {
      const start = performance.now();
      try {
        await save(ref.current);
        events.emit('autosave:success', { entityType: 'graph', count: 1, elapsedMs: performance.now() - start });
      } catch (e) {
        events.emit('autosave:failure', { entityType: 'graph', attempt: 1, error: e });
      }
    });
  }
  useEffect(() => {
  schedulerRef.current?.request();
  }, [data]);
}
