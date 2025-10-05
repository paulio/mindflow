// Simple typed event bus based on contracts/events.md
import type { ThumbnailCacheEntry } from '../../specs/009-the-home-library/contracts/thumbnail-cache-entry.schema';
import type { ThumbnailRefreshEvent } from '../../specs/009-the-home-library/contracts/thumbnail-refresh-event.schema';
import { ThumbnailRefreshEventSchema, createThumbnailRefreshLogContext } from '../../specs/009-the-home-library/contracts/thumbnail-refresh-event.schema';

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
  | 'edge:reconnected'
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
  | 'node:resized'
  | 'note:formatChanged'
  | 'note:formatReset'
  // Reference connection feature events
  | 'reference:created'
  | 'reference:deleted'
  | 'reference:styleChanged'
  | 'reference:repositioned'
  | 'reference:duplicateBlocked'
  | 'reference:labelChanged'
  | 'reference:labelVisibilityChanged'
  | 'telemetry:thumbnail'
  | 'telemetry:thumbnailEvicted';

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
  'edge:reconnected': { edgeId: string; endpoint: 'source'|'target'; prevHandle?: string; newHandle?: string };
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
  'note:formatChanged': { nodeId: string; patch: Record<string, unknown> };
  'note:formatReset': { nodeId: string };
  'reference:created': { id: string; graphId: string; sourceNodeId: string; targetNodeId: string; style: string };
  'reference:deleted': { id: string; graphId: string };
  'reference:styleChanged': { id: string; style: string };
  'reference:repositioned': { id: string; sourceNodeId: string; targetNodeId: string };
  'reference:duplicateBlocked': { sourceNodeId: string; targetNodeId: string; style: string };
  'reference:labelChanged': { id: string; label: string };
  'reference:labelVisibilityChanged': { id: string; hidden: boolean };
  'telemetry:thumbnail': ThumbnailRefreshEvent;
  'telemetry:thumbnailEvicted': ThumbnailEvictionTelemetry;
}

export interface ThumbnailEvictionTelemetry {
  evicted: ThumbnailCacheEntry[];
  totalBytes: number;
  quotaBytes: number;
  timestamp: string;
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

export function emitThumbnailRefreshEvent(event: ThumbnailRefreshEvent) {
  try {
    const parsed = ThumbnailRefreshEventSchema.parse(event);
    const context = createThumbnailRefreshLogContext(parsed);
    const logger = context.level === 'error' ? console.error : console.info;
    logger(context.message, context.payload);
    events.emit('telemetry:thumbnail', parsed);
  } catch (error) {
    console.warn('Failed to emit thumbnail refresh event', error);
  }
}

export function emitThumbnailEvictionEvent(details: {
  evicted: ThumbnailCacheEntry[];
  totalBytes: number;
  quotaBytes: number;
}) {
  if (!details.evicted.length) return;
  const payload: ThumbnailEvictionTelemetry = {
    evicted: details.evicted,
    totalBytes: details.totalBytes,
    quotaBytes: details.quotaBytes,
    timestamp: new Date().toISOString(),
  };
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  if (env?.DEV) {
    console.warn('[telemetry] thumbnail eviction', payload);
  }
  events.emit('telemetry:thumbnailEvicted', payload);
}
