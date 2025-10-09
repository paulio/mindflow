import { describe, expect, it } from 'vitest';
import { validateTelemetryEvent, TelemetryPublisher } from '../../src/lib/telemetry/events';

const baseRequestEvent = {
  eventId: '8e1f06d0-190c-4c85-8bff-495700000001',
  eventType: 'http_request' as const,
  timestamp: '2025-10-07T12:00:00.000Z',
  request: {
    method: 'GET',
    path: '/',
    statusCode: 200,
    durationMs: 120,
    cacheStatus: 'hit' as const,
  },
};

const baseDeploymentEvent = {
  eventId: '8e1f06d0-190c-4c85-8bff-495700000002',
  eventType: 'deployment_status' as const,
  timestamp: '2025-10-07T12:05:00.000Z',
  deployment: {
    deploymentId: 'wf-12345',
    status: 'failed' as const,
    commitSha: 'abc1234def5678901234567890abcdef12345678',
    branch: 'main',
  },
};

describe('TelemetryEvent validation', () => {
  it('accepts well-formed request events', () => {
    expect(() => validateTelemetryEvent(baseRequestEvent)).not.toThrow();
  });

  it('rejects request events missing payload', () => {
    const invalid = { ...baseRequestEvent, request: undefined };
    expect(() => validateTelemetryEvent(invalid)).toThrow('Telemetry event missing request payload');
  });

  it('rejects unknown event types', () => {
    const invalid = { ...baseRequestEvent, eventType: 'login' };
    expect(() => validateTelemetryEvent(invalid)).toThrow('Unsupported telemetry event type: login');
  });
});

describe('Telemetry publisher throttling', () => {
  it('throttles repeated deployment failures within cooldown window', () => {
    const publisher = new TelemetryPublisher({ cooldownMs: 60_000, duplicateKey: 'deploymentId' });
    const first = publisher.enqueue(baseDeploymentEvent);
    const duplicate = publisher.enqueue({ ...baseDeploymentEvent, eventId: '8e1f06d0-190c-4c85-8bff-495700000003' });

    expect(first.accepted).toBe(true);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.reason).toBe('throttled');
  });
});
