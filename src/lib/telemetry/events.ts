export type TelemetryEventType = 'http_request' | 'deployment_status';

export interface TelemetryRequestPayload {
  method: string;
  path: string;
  statusCode: number;
  durationMs?: number;
  cacheStatus?: 'hit' | 'miss' | 'bypass' | 'error' | null;
}

export interface TelemetryDeploymentPayload {
  deploymentId: string;
  status: 'succeeded' | 'failed';
  commitSha?: string;
  branch?: string;
}

export interface TelemetryEvent {
  eventId: string;
  eventType: TelemetryEventType;
  timestamp: string;
  request?: TelemetryRequestPayload;
  deployment?: TelemetryDeploymentPayload;
  metadata?: Record<string, string | number | boolean | null>;
}

export function validateTelemetryEvent(candidate: unknown): TelemetryEvent {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Telemetry event must be an object');
  }

  const event = candidate as TelemetryEvent;

  if (!event.eventId || typeof event.eventId !== 'string') {
    throw new Error('Telemetry event missing eventId');
  }

  if (!event.timestamp || typeof event.timestamp !== 'string') {
    throw new Error('Telemetry event missing timestamp');
  }

  if (event.eventType === 'http_request') {
    if (!event.request) {
      throw new Error('Telemetry event missing request payload');
    }

    const { method, path, statusCode } = event.request;
    if (!method || !path || typeof method !== 'string' || typeof path !== 'string') {
      throw new Error('Telemetry request payload incomplete');
    }
    if (typeof statusCode !== 'number') {
      throw new Error('Telemetry request payload missing status code');
    }
    return {
      ...event,
      deployment: undefined,
    };
  }

  if (event.eventType === 'deployment_status') {
    if (!event.deployment) {
      throw new Error('Telemetry event missing deployment payload');
    }

    const { deploymentId, status, branch } = event.deployment;
    if (!deploymentId || typeof deploymentId !== 'string') {
      throw new Error('Telemetry deployment payload missing deploymentId');
    }
    if (status !== 'succeeded' && status !== 'failed') {
      throw new Error(`Unsupported deployment status: ${String(status)}`);
    }
    if (branch && branch !== 'main') {
      throw new Error(`Unsupported deployment branch: ${branch}`);
    }
    return {
      ...event,
      request: undefined,
    };
  }

  const type = (event as { eventType?: unknown }).eventType;
  throw new Error(`Unsupported telemetry event type: ${String(type)}`);
}

export interface TelemetryPublisherOptions {
  cooldownMs?: number;
  duplicateKey?: string;
  now?: () => number;
}

export interface TelemetryPublishResult {
  accepted: boolean;
  reason?: 'throttled' | 'invalid';
  event?: TelemetryEvent;
  error?: Error;
}

export class TelemetryPublisher {
  private readonly cooldownMs: number;
  private readonly duplicateKey?: string;
  private readonly getNow: () => number;
  private readonly lastAcceptedByKey = new Map<string, number>();

  constructor(options: TelemetryPublisherOptions = {}) {
    this.cooldownMs = Math.max(0, options.cooldownMs ?? 0);
    this.duplicateKey = options.duplicateKey;
    this.getNow = options.now ?? (() => Date.now());
  }

  enqueue(candidate: TelemetryEvent): TelemetryPublishResult {
    try {
      const event = validateTelemetryEvent(candidate);
      const duplicateKeyValue = this.resolveDuplicateKey(event);

      if (duplicateKeyValue) {
        const now = this.getNow();
        const lastAccepted = this.lastAcceptedByKey.get(duplicateKeyValue);
        const eventTimestamp = Date.parse(event.timestamp);
        const effectiveNow = Number.isNaN(eventTimestamp) ? now : eventTimestamp;

        if (lastAccepted && effectiveNow - lastAccepted < this.cooldownMs) {
          return { accepted: false, reason: 'throttled', event };
        }

        this.lastAcceptedByKey.set(duplicateKeyValue, effectiveNow);
      }

      return { accepted: true, event };
    } catch (error) {
      return {
        accepted: false,
        reason: 'invalid',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private resolveDuplicateKey(event: TelemetryEvent): string | undefined {
    if (!this.duplicateKey) {
      return undefined;
    }

  const direct = (event as unknown as Record<string, unknown>)[this.duplicateKey];
    if (typeof direct === 'string' && direct) {
      return direct;
    }

    if (event.deployment && this.duplicateKey in event.deployment) {
      const value = event.deployment[this.duplicateKey as keyof TelemetryDeploymentPayload];
      if (typeof value === 'string' && value) {
        return value;
      }
    }

    if (event.request && this.duplicateKey in event.request) {
      const value = event.request[this.duplicateKey as keyof TelemetryRequestPayload];
      if (typeof value === 'string' && value) {
        return value;
      }
    }

    return undefined;
  }
}
