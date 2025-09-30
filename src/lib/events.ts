// Simple typed event bus based on contracts/events.md
export type EventName =
  | 'graph:created'
  | 'graph:loaded'
  | 'graph:renamed'
  | 'node:created'
  | 'node:updated'
  | 'node:moved'
  | 'node:deleted'
  | 'edge:created'
  | 'edge:deleted'
  | 'autosave:success'
  | 'autosave:failure'
  | 'undo:applied'
  | 'redo:applied'
  | 'theme:changed'
  // Toolbar / annotation feature events
  | 'toolbar:toolActivated'
  | 'toolbar:toolDeactivated'
  | 'node:colorChanged'
  | 'node:zOrderChanged'
  | 'node:resized';

export interface EventPayloads {
  'graph:created': { graphId: string };
  'graph:loaded': { graphId: string };
  'graph:renamed': { graphId: string; name: string };
  'node:created': { graphId: string; nodeId: string };
  'node:updated': { graphId: string; nodeId: string; fields: Record<string, unknown> };
  'node:moved': { graphId: string; nodeId: string; x: number; y: number };
  'node:deleted': { graphId: string; nodeId: string };
  'edge:created': { graphId: string; edgeId: string };
  'edge:deleted': { graphId: string; edgeId: string };
  'autosave:success': { entityType: string; count: number; elapsedMs: number };
  'autosave:failure': { entityType: string; attempt: number; error: unknown };
  'undo:applied': { actionType: string };
  'redo:applied': { actionType: string };
  'theme:changed': { previousTheme: string | null; newTheme: string; ts: number };
  'toolbar:toolActivated': { tool: 'note' | 'rect' };
  'toolbar:toolDeactivated': { tool: 'note' | 'rect' };
  'node:colorChanged': { nodeId: string; bgColor?: string; textColor?: string };
  'node:zOrderChanged': { nodeId: string; frontFlag: boolean };
  'node:resized': { nodeId: string; width: number; height: number; prevWidth: number; prevHeight: number };
}

type Handler<E extends EventName> = (payload: EventPayloads[E]) => void;

class EventBus {
  private listeners: Partial<Record<EventName, Set<Handler<any>>>> = {};

  on<E extends EventName>(event: E, handler: Handler<E>) {
    (this.listeners[event] ||= new Set()).add(handler as Handler<any>);
    return () => this.off(event, handler);
  }

  off<E extends EventName>(event: E, handler: Handler<E>) {
    this.listeners[event]?.delete(handler as Handler<any>);
  }

  emit<E extends EventName>(event: E, payload: EventPayloads[E]) {
    this.listeners[event]?.forEach(h => {
      try { (h as Handler<E>)(payload); } catch { /* ignore */ }
    });
  }
}

export const events = new EventBus();
