import { describe, expect, it, vi } from 'vitest';
import {
  createDeploymentRecord,
  isDeploymentFailure,
  markDeploymentRolledBack,
  summarizeDeployment,
  type DeploymentRecord,
} from '../../src/lib/deployment/deployment-record';

const baseMetadata = {
  deploymentId: 'run-123',
  commitSha: 'abcdef1234567890',
  status: 'succeeded' as const,
};

describe('deployment record helpers', () => {
  it('creates a normalized deployment record with defaults', () => {
    const record = createDeploymentRecord({ ...baseMetadata });

    expect(record.deploymentId).toBe('run-123');
    expect(record.branch).toBe('main');
    expect(record.status).toBe('succeeded');
    expect(record.deployedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('uses provided timestamp when supplied', () => {
    const record = createDeploymentRecord({ ...baseMetadata, timestamp: '2024-10-09T12:00:00.000Z' });

    expect(record.deployedAt).toBe('2024-10-09T12:00:00.000Z');
  });

  it('throws when commit sha is invalid', () => {
    expect(() =>
      createDeploymentRecord({ ...baseMetadata, commitSha: 'not-hex', deploymentId: 'run-456' }),
    ).toThrow(/must be hexadecimal/);
  });

  it('rejects non-main branches', () => {
    expect(() =>
      createDeploymentRecord({ ...baseMetadata, branch: 'feature', deploymentId: 'run-789' }),
    ).toThrow(/Unsupported deployment branch/);
  });

  it('marks deployment rolled back with reviewer and optional notes', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const record = createDeploymentRecord({ ...baseMetadata });

      vi.setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      const rolledBack = markDeploymentRolledBack(record, 'Site Owner', 'Rollback executed');

      expect(rolledBack.status).toBe('rolledBack');
      expect(rolledBack.reviewer).toBe('Site Owner');
      expect(rolledBack.notes).toBe('Rollback executed');
      expect(rolledBack.deployedAt).toBe('2024-01-02T00:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('identifies deployment failures', () => {
    const failure = createDeploymentRecord({ ...baseMetadata, status: 'failed' });

    expect(isDeploymentFailure(failure)).toBe(true);
  });

  it('summarizes deployment records for telemetry dashboards', () => {
    const record: DeploymentRecord = {
      ...createDeploymentRecord({ ...baseMetadata }),
      reviewer: 'Owner',
    };

    expect(summarizeDeployment(record)).toContain('Deployment succeeded');
    expect(summarizeDeployment(record)).toContain(record.commitSha.slice(0, 7));
    expect(summarizeDeployment(record)).toContain('reviewer Owner');
  });
});
